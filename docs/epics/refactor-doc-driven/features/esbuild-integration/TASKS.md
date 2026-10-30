# TASKS — F-02: esbuild Integration

### Story
As a maintainer, I want `esbuild` bundling so that the extension is packaged into a single minified bundle without loose runtime dependencies.

### Tasks
- [x] Task 2.1: Add `esbuild` and `npm-run-all` to `devDependencies` in `package.json`
- [x] Task 2.2: Create `esbuild.js` configured for CJS bundling to `dist/extension.js`
- [x] Task 2.3: Update `package.json` `"main"` to `./dist/extension.js`
- [x] Task 2.4: Update npm scripts in `package.json` (`compile`, `package`, `watch`, `watch:esbuild`, `watch:tsc`, `vscode:prepublish`)
- [x] Task 2.5: Move `minimatch` to `devDependencies`
- [x] Task 2.6: Verify bundle generation (`npm run package`)

### Verification
- Check that `dist/extension.js` is created and minified.
- Verify that `minimatch` code is bundled inside `dist/extension.js`.
