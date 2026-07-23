# Releasing NotebookAwesome

Releases are automated. Pushing a version tag (`v*`) triggers CI, which
publishes to the VS Code Marketplace and Open VSX and cuts a GitHub Release.

## Cut a release

1. Land your changes on `main` using [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `perf:`, etc.) — these drive the version bump and changelog.
2. Cut the release locally:
   ```bash
   npm run release          # normal release: bumps version + writes CHANGELOG.md
   npm run release:first    # first release only: keeps current version, no bump
   ```
   This bumps `package.json`, updates `CHANGELOG.md`, commits, and creates the tag.
3. Push the commit and tag:
   ```bash
   git push --follow-tags origin main
   ```
4. Watch the run under **Actions → Release**. On success, 0.x.y is live on both
   marketplaces and a GitHub Release is created.

## How CI is wired (`.github/workflows/release.yml`)

- `package` → builds and packages the `.vsix` (uploaded as an artifact).
- `publish-vscode` / `publish-openvsx` → run in parallel, each publishing the artifact.
- `github-release` → creates the GitHub Release once both publishes succeed.

If one marketplace fails, use **Re-run failed jobs** — only the failed job (and
the release job) reruns, so an already-successful publish is not repeated (which
would otherwise fail on the duplicate version).

There is also a manual **Run workflow** (`workflow_dispatch`) trigger that
packages the current ref and publishes to **Open VSX only** — useful to push a
version that is already live on the VS Code Marketplace onto Open VSX.

## Tokens / secrets

Two repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Used for | Expiry |
|---|---|---|
| `VSCE_PAT` | VS Code Marketplace publish | **Azure DevOps caps PATs at 1 year — must be renewed** |
| `OVSX_PAT` | Open VSX publish | No forced expiry |

### Renewing `VSCE_PAT` (once a year)

When it expires, only the **Publish to VS Code Marketplace** step fails (401).
Azure DevOps emails a reminder before expiry.

1. [dev.azure.com](https://dev.azure.com) → profile → **Personal Access Tokens** →
   regenerate or create a new token. Scope: **Marketplace → Manage**.
2. Copy it.
3. GitHub repo → **Settings → Secrets and variables → Actions** → edit **`VSCE_PAT`** →
   paste the new value. (Secret name stays the same — no code changes.)
4. If a release already failed on the VS Code step, use **Re-run failed jobs** on
   that run.

## Notes

- The publisher/namespace id is `royayon` on both marketplaces (matches
  `publisher` in `package.json`).
- Open VSX namespace verification (the ✅ shield) is requested via an issue at
  [EclipseFdn/open-vsx.org](https://github.com/EclipseFdn/open-vsx.org/issues) —
  it does not affect publishing, only the verified badge.
- The release toolchain runs on **Node 20** in CI (`@vscode/vsce` → `undici@7`
  needs the Node 20 `File` global). The extension itself targets VS Code 1.70.
