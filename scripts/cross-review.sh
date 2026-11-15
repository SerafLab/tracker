#!/usr/bin/env bash
# Read-only second review by the other model family: run from Claude with `codex`, from Codex with `claude`.
# Usage: scripts/cross-review.sh <codex|claude> [base-branch] [openspec-change-id]
# Requires a clean tree. Prints the report path; the reviewer's log sits next to it.
# Codex: ChatGPT subscription; --ignore-user-config skips ~/.codex/config.toml, which may route Codex to local Ollama.
# Claude: Claude subscription; only read tools and read-only git commands are allowed.
# Env: CROSS_REVIEW_MODEL, CROSS_REVIEW_EFFORT (defaults: gpt-6-astra/opus, high).
set -euo pipefail

reviewer=${1:?usage: scripts/cross-review.sh <codex|claude> [base] [change]}
base=${2:-main}
change=${3:-}
cd "$(git rev-parse --show-toplevel)"

[[ -z $(git status --porcelain) ]] || { echo "Есть незакоммиченные изменения: закоммитьте их до ревью" >&2; exit 1; }
since=$(git merge-base "$base" HEAD)
branch=$(git branch --show-current)

spec="Спецификации нет: проверяй по цели коммитов."
if [[ -n $change ]]; then
  dir="openspec/changes/$change"
  [[ -d $dir ]] || { echo "Нет изменения OpenSpec: $dir" >&2; exit 1; }
  spec="Спецификация: $dir (proposal, design, specs, tasks)."
fi

out="${TMPDIR:-/tmp}"; out="${out%/}/cross-review-$reviewer-${branch//\//-}-$(date +%Y%m%d-%H%M%S)"
log="$out.log"; out="$out.md"

prompt="Ты — второй reviewer, только чтение. Ветка $branch.
Изменения: git diff $since..HEAD (коммиты после $base).
$spec
Проверяй по REVIEW.md, правила проекта — AGENTS.md.
Не меняй файлы и не запускай npm run check. Ответ на русском, в формате REVIEW.md."

effort=${CROSS_REVIEW_EFFORT:-high}
case $reviewer in
  codex)
    codex exec --ignore-user-config --ephemeral -s read-only \
      -m "${CROSS_REVIEW_MODEL:-gpt-6-astra}" -c model_reasoning_effort="$effort" \
      -o "$out" "$prompt" </dev/null >"$log" 2>&1 ;;
  claude)
    claude -p "$prompt" --model "${CROSS_REVIEW_MODEL:-opus}" --effort "$effort" --no-session-persistence \
      --allowedTools Read Grep Glob 'Bash(git diff:*)' 'Bash(git log:*)' 'Bash(git show:*)' 'Bash(git status:*)' \
      </dev/null >"$out" 2>"$log" ;;
  *) echo "Ревьюер: codex или claude" >&2; exit 1 ;;
esac || { echo "$reviewer завершился с ошибкой, журнал: $log" >&2; exit 1; }

echo "$out"
