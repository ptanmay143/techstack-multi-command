# SPEC — F-04: VS Code Developer Config

## Feature
E-02 / F-04 — VS Code Developer Config (`.vscode/`)

## Status
Proposed → Approved

## Problem
`techstack-multi-command` has no `.vscode/` directory. Contributors cannot press F5 to launch the Extension Development Host, and there is no default build task for watch mode. This is a significant gap compared to `techstack-gitignore` which provides three launch configurations and coordinated watch tasks.

## Requirements

### `.vscode/launch.json`
Create with two launch configurations:
1. **Run Extension (multi root workspace)** — opens `test/fixtures/multi-root.code-workspace` with `--disable-extensions --disable-gpu`. `outFiles`: `${workspaceFolder}/dist/**/*.js`. `preLaunchTask`: `"${defaultBuildTask}"`.
2. **Run Extension (single root workspace)** — opens `test/fixtures/workspace-a`. Same flags and outFiles.

### `.vscode/tasks.json`
Create with tasks:
- `"watch"` (default build group, depends on `"npm: watch:esbuild"` and `"npm: watch:tsc"`) — mirrors `techstack-gitignore`.
- `"npm: watch:esbuild"` — runs `node esbuild.js --watch`, problem matcher `$esbuild-watch`, background, group `"build"`.
- `"npm: watch:tsc"` — runs `tsc --noEmit --watch`, problem matcher `$tsc-watch`, background, group `"build"`.

### `.vscode/settings.json`
Create with:
```json
{
  "files.exclude": { "out": false, "dist": false },
  "search.exclude": { "out": true, "dist": true, ".vscode-test": true }
}
```

### `.gitignore` whitelist
The `.gitignore` already includes `!.vscode/settings.json`, `!.vscode/tasks.json`, `!.vscode/launch.json` via the VisualStudioCode template — so the three files will be tracked by git correctly.

## Acceptance Criteria
- `.vscode/launch.json`, `.vscode/tasks.json`, `.vscode/settings.json` all exist and are committed (not gitignored).
- Pressing F5 in VS Code on this project opens the Extension Development Host with the multi-root fixture workspace.
- The default build task (`Ctrl+Shift+B`) starts both watch processes.
- `out/` and `dist/` are hidden from file explorer but excluded from search.

## Data Changes
None.

## API Changes
None.

## Constraints
- `.vscode/` files must reference paths that exist after F-04 (fixture workspaces already exist in `test/fixtures/`).
- `outFiles` must point to `dist/**/*.js` (the esbuild output from F-02) so the VS Code debugger resolves source maps correctly.

## Risks
- Low. These files only affect local development; they have no effect on the published VSIX.

## Out of Scope
- Adding `extensions.json` (recommended extensions list) — not present in gitignore either.
- Adding `keybindings.json` or other per-project VS Code configs.
