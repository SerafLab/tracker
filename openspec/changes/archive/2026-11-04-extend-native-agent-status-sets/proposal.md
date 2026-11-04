# Proposal

## Why

The current local add-agent-mcp-integration proposal includes new explicit status-set selection and applying a set to an empty project. The accepted native WebMCP implementation supersedes its old stdio/loopback transport. Implement only these new product requirements on native WebMCP.

## What Changes

- Require statusSetId for native create_project, including explicit none; return saved project with ordered statuses.
- Add apply_status_set for projects with no statuses; forbid none and atomically refuse conflicting status creation.
- Resolve stable set IDs through the same localized catalogue as UI; keep background route/preference unchanged.
- Update the repository skill to obtain explicit set choice, suggest Simple, and never infer a set from a project name.
- Version the breaking native contract as 2; no compatibility overload or older protocol implementation.

## Capabilities

### Modified Capabilities

- agent-task-access: explicit native status-set tools and agent choice workflow.

## Impact

Depends on add-project-status-presets application operation. Existing native lifetime, session binding, response journal, input validation and mutation guards remain. No Node relay or storage migration. Description/note writes and project deletion stay absent.
