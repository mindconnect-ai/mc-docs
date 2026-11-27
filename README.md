# mc-docs: mindconnect documentation portal

One Docusaurus 3 site that brings the docs of all mindconnect projects together, served at
**https://mindconnect-ai.github.io/mc-docs/**.

| Section | Source repo | Docs folder | License |
|---|---|---|---|
| `/mindconnect/` | [mindconnect-ai/mindconnect](https://github.com/mindconnect-ai/mindconnect) | `website/docs` | Apache-2.0 |
| `/semantic-ui/` | [mindconnect-ai/mc-semantic-ui](https://github.com/mindconnect-ai/mc-semantic-ui) | `website/docs` | Apache-2.0 |
| `/architector/` | `mindconnect-ai/mc-architector` (private) | `docs/site` | Proprietary, free to use |

The standalone sites https://mindconnect-ai.github.io/mindconnect/ and
https://mindconnect-ai.github.io/mc-semantic-ui/ stay as they are. The portal links to them.

## How it fits together

- **The current docs stay in each project's repo.** That is where they are written, next to the code,
  so AI tools read them together with it. This repo never commits copies of the current docs. At build
  time the repos are checked out into `sources/<project>/` (gitignored), and each docs-plugin instance
  reads from there.
- **The version archive lives here.** When a project releases, a snapshot of its docs is committed here
  as `<project>_versioned_docs/`, `<project>_versioned_sidebars/` and `<project>_versions.json`
  (standard Docusaurus versioning per instance). "Current" always comes live from the project's
  `main` branch. Archived versions are served at `/<project>/<version>/`.
- **One docs-plugin instance per project**, each with its own sidebar, navbar entry, version dropdown
  (shown inside its own section once a version is archived) and license line in the footer.

```
projects.mjs                   the projects: repo, branch, docs folder, sidebar, license, ...
docusaurus.config.js           builds one docs instance per project
scripts/sources.mjs            finds each project's checkout (env var, sources.local.json, sources/, default)
scripts/prepare.mjs            stages sidebars, images and stubs into .generated/ (runs before start/build)
scripts/snapshot.mjs           archives a released version
plugins/remark-portal-links.mjs  adapts absolute links (/img/..., /agents/...) to the portal's paths
plugins/llms-txt.mjs           writes build/llms.txt listing every page
src/pages/index.js             landing page
src/theme/Footer/Copyright     per-section license line
.github/workflows/deploy.yml   build and deploy to GitHub Pages
.github/workflows/snapshot.yml archive a release
```

### Adapting the docs to the portal

The docs are written for their standalone sites, where they live at the site root. Docusaurus resolves
relative links on its own; `plugins/remark-portal-links.mjs` handles the absolute ones:

- `/img/foo.svg` → the project's `static/img`, staged to `/_assets/<project>/img/` (for archived
  versions: `versioned_static/_assets/<project>/<version>/img/`, so later image changes do not alter
  old versions).
- `/agents/overview` → `/<project>/agents/overview` (or `/<project>/<version>/...`).
- Semantic UI only: the live demos, the embedded iframes and the visual editor need the compiled
  semantic-ui bundles, a Maven build. They stay on the standalone semantic-ui site, and
  `pathname:///...` and `/mc-semantic-ui/...` links point there. The iframes are rewritten to
  absolute URLs, so they also work when you preview locally.

A project whose checkout is missing does not break the build. It gets a stub page and a warning.

## Local development

Requires Node 20 or later (CI uses 22).

```bash
npm ci
```

```bash
npm start
```

`npm start` and `npm run build` read the projects from your sibling checkouts. For each project the
first of these that contains the docs folder wins:

1. env var `MC_DOCS_SRC_MINDCONNECT`, `MC_DOCS_SRC_SEMANTIC_UI`, `MC_DOCS_SRC_ARCHITECTOR` (path to the repo root)
2. `sources.local.json` (gitignored; copy `sources.local.example.json`)
3. `sources/<project>/` (where CI checks the repos out)
4. the defaults:
   - `~/workspace/private/mindconnect-ai/mindconnect/main/mindconnect`
   - `~/workspace/private/mindconnect-ai/mc-semantic-ui/main/mc-semantic-ui`
   - `~/workspace/private/mc-architector`

`npm start` prints which checkout it uses for each project. Doc edits in a checkout show up live.
After changing a project's sidebar or images, restart `npm start`.

## Deployment

`.github/workflows/deploy.yml` builds and deploys on:

- a push to `main` of this repo
- `repository_dispatch` of type `docs-changed` (a project tells the portal its docs changed)
- a nightly schedule (03:23 UTC), so the portal follows the projects even without any hook
- manual runs (`workflow_dispatch`)

Pull requests are built but not deployed.

### One-time setup (repo admin)

1. **Switch Pages to GitHub Actions.** Settings → Pages → Build and deployment → Source:
   **GitHub Actions**. Until you do this, Pages keeps serving the old build from the `gh-pages` branch.
   Delete the `gh-pages` branch once the new site is live.
2. **Create `DOCS_READ_TOKEN`** so the build can read the private `mc-architector` repo (next section).
   Without it the Architector section is a stub and the run shows a warning.

### `DOCS_READ_TOKEN`: read access to mc-architector

1. GitHub → your avatar → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
2. Resource owner: **mindconnect-ai**. Repository access: **Only select repositories** →
   `mc-architector`.
3. Repository permissions: **Contents: Read-only** (Metadata: Read-only is added automatically).
   Nothing else.
4. Pick an expiry and note it. When the token expires, Architector silently becomes a stub again
   (the run shows a warning).
5. If the organization requires approval for fine-grained tokens, approve it under
   Organization settings → Personal access tokens → Pending requests.
6. In `mindconnect-ai/mc-docs`: Settings → Secrets and variables → Actions → New repository secret,
   name `DOCS_READ_TOKEN`, value = the token.

A GitHub App installation token works as well if you prefer not to tie this to a personal account.

## Archiving a release

When a project releases, archive its docs at the release tag:

- **Manually:** Actions → **Archive a docs version** → Run workflow, then choose the project and
  version (for example `0.8.4`). The ref defaults to `v<version>`.
- **Automatically**, from the project's release workflow, via `repository_dispatch` type `docs-release`.

The workflow checks the project out at the tag, runs `npm run snapshot -- <project> <version>`,
checks that the site builds, commits the snapshot to `main` and starts a deploy.

Locally the same works with the sibling checkout at the release tag:

```bash
npm run snapshot -- mindconnect 0.8.4
```

### Triggering it from a project's release

The project needs a token that may send `repository_dispatch` events to `mc-docs`: a fine-grained
token for resource owner `mindconnect-ai`, repository `mc-docs`, permission **Contents: Read and
write**. Store it in the project repo as secret `MC_DOCS_DISPATCH_TOKEN`.

In mindconnect and mc-semantic-ui the release workflow creates the tag itself, using
`GITHUB_TOKEN`. Tags pushed that way do not start other workflows, so `on: push: tags` will not fire.
Add the dispatch as the last step of the release job instead:

```yaml
      - name: Archive docs in mc-docs
        env:
          GH_TOKEN: ${{ secrets.MC_DOCS_DISPATCH_TOKEN }}
          VERSION: ${{ steps.version.outputs.release }}   # however the job names the released version
        run: |
          gh api repos/mindconnect-ai/mc-docs/dispatches \
            -f event_type=docs-release \
            -f "client_payload[project]=mindconnect" \
            -f "client_payload[version]=$VERSION" \
            -f "client_payload[ref]=v$VERSION"
```

Use `semantic-ui` or `architector` as `project` in the other repos. If a project creates its tags
some other way (by hand, or with a token that does trigger workflows), a separate workflow
`on: push: tags: ['v*']` with the same step works too.

### Rebuilding when a project's docs change

The nightly build picks up changes within a day. To publish sooner, a project can send
`docs-changed` after a push to `main` that touches its docs:

```yaml
on:
  push:
    branches: [main]
    paths: ['website/docs/**', 'website/sidebars.js', 'website/static/img/**']
jobs:
  notify-portal:
    runs-on: ubuntu-latest
    steps:
      - env:
          GH_TOKEN: ${{ secrets.MC_DOCS_DISPATCH_TOKEN }}
        run: gh api repos/mindconnect-ai/mc-docs/dispatches -f event_type=docs-changed
```

## Adding a project

Add an entry to `projects.mjs`, a checkout step to `.github/workflows/deploy.yml`, and the project to
the `options` and the `case` in `.github/workflows/snapshot.yml`.
