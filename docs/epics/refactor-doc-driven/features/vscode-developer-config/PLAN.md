# PLAN — F-04: VS Code Developer Config

## Implementation Strategy
1. Create `.vscode/launch.json` with multi-root and single-root Extension Development Host launch profiles.
2. Create `.vscode/tasks.json` configuring watch tasks (`watch`, `watch:esbuild`, `watch:tsc`).
3. Create `.vscode/settings.json` configuring file and search exclusions for output directories (`out`, `dist`, `.vscode-test`).

## Migration
None. Developer environment configuration.

## Testing
Verify that launch configurations match existing fixtures in `test/fixtures/`.

## Deployment
Committed to repository.
