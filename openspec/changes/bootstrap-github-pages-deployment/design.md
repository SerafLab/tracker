# Design

## Context

The repository contains product and technical planning but no application code. See `proposal.md` for motivation and `specs/published-web-app/spec.md` for the required public behavior. GitHub Pages must serve the project at `/tracker/`; the agreed web MVP uses a static React, TypeScript, and Vite SPA, with no server-side routing dependency.

## Goals / Non-Goals

**Goals:**

- Establish a minimal, reproducible production build that proves the chosen toolchain and Pages base path.
- Publish that build from `main` with GitHub's supported Pages artifact workflow.
- Detect a deployment that completes but does not serve the expected application shell.

**Non-Goals:**

- No tracker domain features, persistence, routing, PWA/service worker, offline behavior, backup, or release acceptance on mobile devices.
- No pull-request CI, branch-protection configuration, Dependabot, version display, or GitHub release process.

## Decisions

### Minimal application shell

Create a strict TypeScript React application with Vite and a deliberately small root screen containing stable, human-readable tracker identification. This supplies an observable smoke-check target without pre-committing domain UI or a component architecture. A static HTML-only placeholder was considered, but it would not validate the selected React/Vite build path.

### Project-aware static build

Configure Vite's production base as `/tracker/` and keep the first screen at the application root. This makes generated asset URLs compatible with GitHub Pages project hosting and avoids needing history-mode server fallback. A custom domain or root-origin deployment was rejected because the agreed public address is a repository Pages URL; hash routing is deferred until navigation exists.

### GitHub Pages deployment workflow

Use a workflow triggered by pushes to `main`: install the lockfile-resolved dependencies on Node.js 24 LTS, build once into `dist`, upload that directory as the Pages artifact, and deploy it through GitHub Pages' official Actions. The deployment job receives only the Pages and ID-token permissions it needs; other jobs retain read-only contents access. Committing generated `dist` or deploying from a branch was rejected because it makes the delivered artifact less reproducible and diverges from the agreed Actions deployment model.

### Branch and pull-request flow

Implement this change on `feature/bootstrap-github-pages-deployment`; commits for the change remain on that branch until it is reviewed and merged through a pull request into `main`. The published deployment is therefore always built from `main`, rather than from a work-in-progress branch. Direct commits to `main` were rejected because the project process requires pull requests for changes to its protected integration branch.

### Post-deploy HTTP smoke check

Run a bounded HTTP check after the Pages deployment URL is available. It verifies a successful response at the canonical `/tracker/` URL and the stable root-shell marker in the returned HTML. This deliberately tests the deployed site rather than only the local build; browser interaction, service-worker checks, and retries beyond a practical propagation window are deferred to later changes.

## Risks / Trade-offs

- [GitHub Pages propagation may lag behind workflow completion] → Use a bounded retry in the smoke step and report the failing URL and response details when it expires.
- [The Pages source setting or repository permissions may not be enabled] → Document the one-time repository configuration and let the workflow surface actionable permission errors.
- [A text marker proves only the shell, not feature behavior] → Keep the smoke check narrow and add feature-specific tests as capabilities are introduced.

## Migration Plan

1. Create `feature/bootstrap-github-pages-deployment` from `main`, then add the application scaffold, lockfile, and project-path build configuration there.
2. Add the Pages workflow and configure the repository's Pages source for GitHub Actions.
3. Open and merge a pull request from the feature branch into `main`; the first successful run publishes the initial shell.
4. Confirm the canonical public URL with the automated smoke result and a manual browser visit.

Rollback: if publication fails or a bad static build is served, fix forward and redeploy the corrected commit. Because this change creates no persistent user data or schema, re-deploying the previous successful commit is also safe.
