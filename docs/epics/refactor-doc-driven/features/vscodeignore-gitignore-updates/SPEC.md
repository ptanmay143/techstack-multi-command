# SPEC — F-05: .vscodeignore and .gitignore Updates

## Feature
E-02 / F-05 — `.vscodeignore` and `.gitignore` Updates

## Status
Proposed → Approved

## Problem
The current `.vscodeignore` and `.gitignore` files were written for a `tsc`-only build with no `dist/` output. After F-02 adds esbuild:

- `dist/` will be generated at build time and must be excluded from git.
- The VSIX must include `dist/extension.js` (the bundle) but exclude `src/`, `test/`, `out/`, tooling config, and `node_modules/`.
- The current `.vscodeignore` already excludes several paths; it must be updated to also exclude the new tooling files (`esbuild.js`, `eslint.config.mjs`, `.vscode/**`) and include `dist/extension.js`.

## Requirements

### `.gitignore`
Append `dist` to the custom rules section (or add it as a new custom rule). The existing gitignore structure (managed by the extension itself) must be preserved.

### `.vscodeignore`
Update to:
```
.gitignore
.vscodeignore
.vscode/**
.vscode-test/**
docs/**
src/**
test/**
tsconfig.json
out/**
esbuild.js
eslint.config.mjs
**/*.map
package-lock.json
icon/**
!dist/extension.js
```

The `!dist/extension.js` negation ensures the bundle is included while `out/**` excludes the raw tsc output.

## Acceptance Criteria
- `dist/` is listed in `.gitignore` (the custom rules section).
- `git status` after running `npm run package` shows `dist/extension.js` as untracked/ignored.
- `vsce ls` output includes `dist/extension.js` and `package.json` but does NOT include `src/`, `test/`, `out/`, `esbuild.js`, `eslint.config.mjs`, `node_modules/`, or `icon/`.
- The VSIX file size is smaller than the pre-refactor VSIX (no `node_modules/minimatch/` shipped).

## Data Changes
None.

## API Changes
None.

## Constraints
- The existing gitignore managed sections (Linux, macOS, Node, VisualStudioCode, Windows templates) must not be disturbed.
- `.vscodeignore` must keep `package-lock.json` excluded.

## Risks
| Risk | Mitigation |
|---|---|
| Incorrect `.vscodeignore` accidentally excludes `dist/extension.js` | Verify with `vsce ls` before committing |
| `!dist/extension.js` negation doesn't work with some vsce versions | Use `vsce ls` to confirm; adjust pattern if needed |

## Out of Scope
- Changing the gitignore template selections.
- Adding a `.npmignore`.
