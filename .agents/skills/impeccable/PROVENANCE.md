# Vendored Impeccable

- Upstream: https://github.com/pbakaus/impeccable
- Commit: `5c2d1be3fac95bd1de722cc9db027a0b0efeefe7` (main inspected 2026-10-26).
- Package path: `.agents/skills/impeccable`.
- Skill metadata version: `4.7.1`; bundled launcher engine version: `0.1.17`.
- Installed with the Codex skill-installer `install-skill-from-github.py`, using
  `--repo pbakaus/impeccable --ref 5c2d1be3fac95bd1de722cc9db027a0b0efeefe7
  --path .agents/skills/impeccable --dest <project>/.agents/skills`.
- Upstream root `LICENSE` and `NOTICE.md` are included unchanged from the same commit.

Local adaptations: `agents/openai.yaml` adds
`policy.allow_implicit_invocation: false` for the user's explicit-only workflow;
this provenance file is added. The Unix launcher executable bit is restored after
the installer ZIP extraction. The Windows launcher retains the CRLF endings
expanded by the upstream GitHub ZIP export; its content matches the Git blob
after newline normalization. Other upstream content is unchanged.

The project role and workflow overrides live in `docs/agents/designer.md` and
`.codex/agents/designer.toml`, outside the upstream package. Native hooks, global
configuration, shortcuts and a separate upstream CLI installation are not installed.
Runtime binaries and caches are not vendored. The launcher pins and verifies its
engine download using `scripts/VERSION` and `scripts/engine-checksums.txt`.

To update, compare an explicitly selected upstream commit in a temporary directory,
use the skill-installer with that commit, review differences, preserve the explicit
invocation policy, refresh LICENSE/NOTICE and this record, and validate the role.
Do not use upstream automatic update/install flows: they may install hooks.
