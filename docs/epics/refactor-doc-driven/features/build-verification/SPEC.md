# SPEC — F-06: Build and Lint Verification

## Feature
E-02 / F-06 — Build and Lint Verification

## Status
Proposed → Approved

## Problem
After F-01 through F-05, the full build pipeline must be validated end-to-end to confirm that no refactoring change has broken compilation, linting, testing, or packaging.

## Requirements
1. `tsc --noEmit` exits 0 — no TypeScript errors.
2. `npm run lint` (`eslint src`) exits 0 — no ESLint errors.
3. `npm run compile` (tsc + esbuild dev build) exits 0.
4. `npm run package` (tsc + esbuild production build) exits 0 and produces `dist/extension.js`.
5. `npm test` (`node --test out/test/*.test.js`) exits 0 — unit tests pass.
6. `npm run test:extension` (VS Code extension host tests) exits 0 — integration tests pass.
7. `npm run vsce-package` exits 0 — produces a `.vsix`.
8. `vsce ls` confirms `dist/extension.js` is in the VSIX and `node_modules/` is absent.

## Acceptance Criteria
- All eight items above exit 0 or produce expected output.
- The `.vsix` is smaller than the pre-refactor version (no `node_modules/minimatch/`).
- No user-facing behaviour has changed (same commands, same output, same settings).

## Data Changes
None (verification only).

## API Changes
None.

## Constraints
- This feature is a gate: it must pass before the epic is marked Implemented.
- Any failure must be treated as a regression from F-01–F-05 and fixed in the appropriate feature, not patched here.

## Risks
- Low. If all preceding features are correct, verification passes trivially.

## Out of Scope
- Setting up CI/CD pipelines.
- Performance benchmarking of the bundled extension.
