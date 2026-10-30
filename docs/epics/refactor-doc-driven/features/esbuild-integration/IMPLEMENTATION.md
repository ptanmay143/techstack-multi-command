# IMPLEMENTATION — F-02: esbuild Integration

## Summary
- Added `esbuild` and `npm-run-all` to `devDependencies`.
- Moved `minimatch` from `dependencies` to `devDependencies`.
- Created `esbuild.js` targeting Node 18 CJS output at `dist/extension.js`.
- Updated `package.json` `"main"` to `./dist/extension.js`.
- Updated npm scripts (`compile`, `package`, `watch`, `watch:esbuild`, `watch:tsc`, `compile-tests`, `check-types`, `lint`, `test`, `test:extension`, `vsce-package`).

## Verification
- Bundle verification and test verification pending `npm install`.
