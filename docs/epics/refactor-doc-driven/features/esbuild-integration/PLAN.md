# PLAN — F-02: esbuild Integration

## Implementation Strategy
1. Install `esbuild` and `npm-run-all` as devDependencies.
2. Create `esbuild.js` configured to bundle `src/extension.ts` into `dist/extension.js`.
3. Mark `vscode` as external; bundle `minimatch`.
4. Move `minimatch` from `dependencies` to `devDependencies` in `package.json`.
5. Update `package.json` `"main"` to `./dist/extension.js` and add build/package/watch scripts.
6. Verify development build (`node esbuild.js`) and production build (`npm run package`).

## Migration
None. Bundled JS is drop-in compatible with VS Code.

## Testing
Run unit tests with Node (`npm test`) and extension host tests (`npm run test:extension`).

## Deployment
Packaged into VSIX via `npm run vsce-package`.
