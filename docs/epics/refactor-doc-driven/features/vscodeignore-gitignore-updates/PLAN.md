# PLAN — F-05: .vscodeignore and .gitignore Updates

## Implementation Strategy
1. Update `.gitignore` to add `dist` to the project-specific custom ignore rules section.
2. Update `.vscodeignore` to exclude `src/**`, `test/**`, `out/**`, `esbuild.js`, `eslint.config.mjs`, and `.vscode/**`, while explicitly including `!dist/extension.js`.

## Migration
None. Repository maintenance and packaging configuration.

## Testing
Run `npx @vscode/vsce ls` to inspect the list of files bundled into the final `.vsix` package.

## Deployment
Committed to repository.
