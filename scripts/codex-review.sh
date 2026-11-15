#!/usr/bin/env bash
# Second review by Codex through the ChatGPT subscription, read-only.
# Usage: scripts/codex-review.sh [base-branch] [openspec-change-id]
# Env: CODEX_REVIEW_MODEL (default gpt-6-astra), CODEX_REVIEW_EFFORT (default high).
# Requires a clean tree. Prints the report path; the Codex log sits next to it.
# --ignore-user-config skips ~/.codex/config.toml,
# whose openai_base_url routes requests to a local Ollama instead of OpenAI.
set -euo pipefail

base=${1:-main}
change=${2:-}
root=$(git rev-parse --show-toplevel)
cd "$root"

[[ -z $(git status --porcelain) ]] || { echo "Есть незакоммиченные изменения: закоммитьте их до ревью" >&2; exit 1; }
since=$(git merge-base "$base" HEAD)
branch=$(git branch --show-current)

spec="Спецификации нет: проверяй только diff."
if [[ -n $change ]]; then
  dir="openspec/changes/$change"
  [[ -d $dir ]] || { echo "Нет изменения OpenSpec: $dir" >&2; exit 1; }
  spec="Спецификация: $dir (proposal, design, specs, tasks). Проверь соответствие ей."
fi

out="${TMPDIR:-/tmp}"; out="${out%/}/codex-review-${branch//\//-}-$(date +%Y%m%d-%H%M%S)"
log="$out.log"; out="$out.md"

prompt="Ты — второй reviewer, только чтение. Ветка $branch.
Изменения: git diff $since..HEAD (коммиты после $base).
$spec
Правила проекта: AGENTS.md, CLAUDE.md.
Ищи ошибки корректности, расхождения со спецификацией, посторонние правки и непокрытое тестами поведение.
Не меняй файлы и не запускай npm run check.
Ответ на русском, до 300 слов: замечания по убыванию важности, у каждого — \`файл:строка\` и сценарий сбоя.
Если замечаний нет, так и напиши."

codex exec --ignore-user-config --ephemeral -s read-only \
  -m "${CODEX_REVIEW_MODEL:-gpt-6-astra}" \
  -c model_reasoning_effort="${CODEX_REVIEW_EFFORT:-high}" \
  -o "$out" "$prompt" </dev/null >"$log" 2>&1 \
  || { echo "codex exec завершился с ошибкой, журнал: $log" >&2; exit 1; }

echo "$out"
