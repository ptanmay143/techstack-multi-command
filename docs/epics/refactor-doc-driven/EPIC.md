# Epic E-02: Multi Command Executor — Refactor to Doc-Driven Structure

## Status

In Progress

## Objective

Refactor the TechStack Multi Command Executor extension so that its repository structure, documentation, build tooling, and source code conform to the doc-driven development standard — without changing any user-facing behaviour, contributed command IDs, configuration keys, or the extension's runtime dependency surface.

## Scope

### In Scope

- Complete the `docs/` hierarchy (PROJECT_CONSTITUTION, PROJECT_STATUS, ARCHITECTURE, ADRs, EPIC_INDEX, EPICs, SPEC, PLAN, TASKS, IMPLEMENTATION, CHANGELOG, ROADMAP).
- Add `esbuild` bundler: `esbuild.js` script, update `package.json` scripts (`compile`, `package`, `watch`, `watch:esbuild`, `watch:tsc`, `lint`, `vscode:prepublish`), update `package.json` `"main"` to point to `dist/extension.js`.
- Add ESLint: `eslint.config.mjs` mirroring `techstack-gitignore`'s config; add ESLint and `typescript-eslint` packages to `devDependencies`; fix any lint errors in `src/`.
- Add `.vscode/` developer config: `launch.json` (F5 debug for single-root and multi-root fixtures), `tasks.json` (watch tasks), `settings.json` (hide `out/`, `dist/` from search).
- Update `.vscodeignore` to exclude new files appropriately from the published VSIX.
- Update `.gitignore` to exclude `dist/` build output.
- Fix `tsconfig.json` if needed to align with the unified `rootDir: "."` approach and ensure `out/` output covers both `src/` and `test/`.
- Verify all existing tests pass after build-tooling changes.

### Out of Scope

- Any change to contributed command IDs, configuration keys, activation events, or submenu IDs.
- Any change to `src/` module logic or exported interfaces.
- Any change to the VS Code minimum engine version (`^1.85.0`).
- New user-facing features of any kind.
- Changing the test runner from `@vscode/test-electron` + Mocha (integration) / Node built-in (unit).

## Features

1. **F-01 — Documentation scaffold**
   Complete all doc-driven documents in `docs/`. Populate from the approved ARCHITECTURE.md and the existing `docs/` partial content. No source changes.

2. **F-02 — esbuild integration**
   Add `esbuild` as `devDependency`. Create `esbuild.js` bundling `src/extension.ts` → `dist/extension.js`. Update `package.json` scripts and `"main"` field. Add `dist/` to `.gitignore`. Add `esbuild` problem-matcher task to `.vscode/tasks.json`.

3. **F-03 — ESLint integration**
   Add `eslint`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, and `typescript-eslint` to `devDependencies`. Create `eslint.config.mjs`. Resolve all lint errors in `src/`. Add `lint` script to `package.json`.

4. **F-04 — `.vscode/` developer config**
   Add `.vscode/launch.json` with Extension Development Host configs for the `test/fixtures/multi-root.code-workspace` workspace. Add `.vscode/tasks.json` with watch tasks (esbuild + tsc). Add `.vscode/settings.json` hiding `out/` and `dist/` from file explorer and search. Add `npm-run-all` to `devDependencies` for parallel watch.

5. **F-05 — `.vscodeignore` and `.gitignore` updates**
   Ensure `dist/` is excluded from git. Ensure only the production bundle (`dist/extension.js`) is included in the VSIX; source, tests, and tooling config are excluded.

6. **F-06 — Build and lint verification**
   Confirm `npm run compile`, `npm test`, `npm run test:extension`, and `npm run vsce-package` all succeed with no new errors after all above changes.

## Dependencies

- Approved [ARCHITECTURE.md](../architecture/ARCHITECTURE.md).
- Existing `src/` modules — unchanged.
- Existing `test/` suite — unchanged.
- `esbuild`, `eslint`, `typescript-eslint`, `npm-run-all` — new `devDependencies`.
- `minimatch` — remains the sole `dependency`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ESLint `recommendedTypeChecked` rejects existing `src/` code | Medium | Fix lint errors in F-03 as part of the same change; no functional changes permitted |
| `"main"` change from `out/src/extension.js` to `dist/extension.js` breaks extension test host | Medium | Keep both `out/` (tsc) and `dist/` (esbuild) outputs; test runner uses `out/`; VSIX uses `dist/` |
| `npm-run-all` parallel watch conflicts with tsc incremental | Low | Mirror the exact watch pattern from `techstack-gitignore` which already uses this setup |
| `.vscodeignore` misconfiguration bloats or breaks the VSIX | Low | Validate with `vsce ls` before packaging |

## Success Criteria

- `docs/` hierarchy is complete and consistent with ARCHITECTURE.md.
- `esbuild.js` exists and `npm run package` produces `dist/extension.js`.
- `eslint.config.mjs` exists and `npm run lint` exits 0 with no errors.
- `.vscode/launch.json`, `tasks.json`, and `settings.json` exist and are committed.
- `npm run compile` exits 0.
- `npm test` exits 0 (unit tests pass).
- `npm run test:extension` exits 0 (integration tests pass).
- `npm run vsce-package` produces a `.vsix` without errors.
- No user-facing behaviour has changed.
- `dist/` is in `.gitignore`.
