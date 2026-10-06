# Tasks

## 1. Application scaffold and production build

- [x] 1.1 Create `feature/bootstrap-github-pages-deployment` from the current `main` branch and keep all implementation commits for this change on it; verify the branch has `main` as its merge base.
- [x] 1.2 Create the strict TypeScript React/Vite application shell with a stable, visible tracker identifier; verify `npm run dev` renders that identifier in a browser.
- [x] 1.3 Configure npm, Node.js 24 LTS metadata, and the committed lockfile; verify `npm ci` succeeds on a clean checkout.
- [x] 1.4 Configure Vite to build for the `/tracker/` base path and add the production build/preview commands; verify `npm run build` succeeds and `dist/index.html` references application assets under `/tracker/`.
- [x] 1.5 Document the local installation, build, preview, and one-time GitHub Pages configuration steps in the README; verify each documented npm command runs as written.

## 2. Pages publication and smoke check

- [x] 2.1 Add a `main`-push GitHub Actions workflow that installs lockfile-resolved dependencies, builds once, uploads `dist` as the Pages artifact, and deploys it with least-privilege permissions; verify the workflow YAML is valid and uses full commit-SHA-pinned Actions.
- [x] 2.2 Add a bounded post-deployment HTTP smoke step that checks the canonical Pages URL and its stable shell marker; verify its failure message includes the public URL and the workflow fails when the check cannot pass.
- [ ] 2.3 Open a pull request from `feature/bootstrap-github-pages-deployment` to `main`, then merge it after Pages is configured for GitHub Actions; verify the deployment run succeeds and `https://seraflab.github.io/tracker/` loads the tracker shell with its required assets.

## 3. Integration verification

- [x] 3.1 Run `npm ci` and `npm run build` from a clean working tree; verify both complete successfully and the built entry page remains project-path-safe.
- [ ] 3.2 Review the successful Pages workflow and browser-load the canonical URL; verify the automated smoke check passed and the served page visibly identifies the tracker.
