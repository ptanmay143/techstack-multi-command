# SPEC — F-02: esbuild Integration

## Feature
E-02 / F-02 — esbuild Integration

## Status
Proposed → Approved

## Problem
`techstack-multi-command` uses `tsc` as its sole build tool. The published extension's `"main"` points to `out/src/extension.js` (a raw tsc output with all Node module imports unresolved at the filesystem level). This is not a bundled distribution — it requires the `node_modules/` directory to be present at runtime, which `vsce` does include but at the cost of VSIX size. The extension should use esbuild to produce a single bundled `dist/extension.js`, matching `techstack-gitignore`'s build pattern.

## Requirements
1. Add `esbuild` to `devDependencies` in `package.json`.
2. Create `esbuild.js` at the project root — mirrors `techstack-gitignore/esbuild.js`:
   - Entry point: `src/extension.ts`.
   - Output: `dist/extension.js`.
   - Format: `cjs`, platform: `node`, target: `node20` (matching `engines.node` in the project's runtime environment).
   - External: `['vscode', 'minimatch']` — `minimatch` is a runtime dep that must remain external OR bundle it (preferred: bundle it since it's the only runtime dep; mark only `vscode` as external).
   - Production flag (`--production`): minify + no source maps.
   - Dev/watch: source maps enabled, `--watch` mode supported.
   - Problem-matcher plugin for VS Code task integration.
3. Update `package.json` `"main"` from `"./out/src/extension.js"` to `"./dist/extension.js"`.
4. Add `npm-run-all` to `devDependencies`.
5. Update `package.json` scripts:
   - `"vscode:prepublish"`: `"npm run package"`
   - `"compile"`: `"tsc --noEmit && node esbuild.js"`
   - `"watch"`: `"npm-run-all -p watch:*"`
   - `"watch:esbuild"`: `"node esbuild.js --watch"`
   - `"watch:tsc"`: `"tsc --noEmit --watch"`
   - `"package"`: `"tsc --noEmit && node esbuild.js --production"`
   - Keep `"test"` and `"test:extension"` unchanged (they use `out/` from tsc).

> **Note on `minimatch`:** Since `minimatch` is the only runtime dependency, it should be bundled by esbuild (i.e. not listed in `external`). Only `vscode` must remain external. This eliminates `minimatch` from `dependencies` and the VSIX `node_modules/`.

6. Move `minimatch` from `dependencies` to `devDependencies` once confirmed it is bundled by esbuild.
7. Add `dist/` to `.gitignore`.

## Acceptance Criteria
- `node esbuild.js` produces `dist/extension.js`.
- `node esbuild.js --production` produces a minified `dist/extension.js` with no source map.
- `npm run package` exits 0.
- `npm run vsce-package` produces a `.vsix`. Running `vsce ls` on it shows `dist/extension.js` is included and `node_modules/minimatch/` is excluded.
- `npm test` and `npm run test:extension` still pass (they compile with tsc to `out/` and use `out/src/extension.js`).
- `dist/` is listed in `.gitignore`.

## Data Changes
None (no runtime behaviour changes).

## API Changes
None. Bundling is transparent to VS Code and the extension API.

## Constraints
- The `tsc` compilation to `out/` must still work for the test pipeline.
- `minimatch` bundled means the VSIX no longer needs to ship `node_modules/minimatch/`.
- The `esbuild.js` node target must be compatible with the minimum VS Code Node.js version (VS Code 1.85 ships with Node 18; `node18` is a safe target).

## Risks
| Risk | Mitigation |
|---|---|
| `minimatch` fails to bundle (e.g. uses `require` dynamically) | Test the bundle with a real workflow run; fall back to keeping it as external if needed |
| `"main"` change breaks extension test host | Test runner (`test:extension`) uses its own compiled `out/src/extension.js` path via `extensionDevelopmentPath`, not `"main"` — should be unaffected |

## Out of Scope
- Changing the test runner from `@vscode/test-electron`.
- Switching to ES modules.
