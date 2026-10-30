# PLAN — F-06: Build and Lint Verification

## Implementation Strategy
Execute all verification pipelines end-to-end:
1. `tsc --noEmit`
2. `npm run lint`
3. `npm run compile`
4. `npm run package`
5. `npm test`
6. `npm run test:extension`
7. `npx @vscode/vsce package`

## Migration
None.

## Testing
Command exit status checks.

## Deployment
Verification only.
