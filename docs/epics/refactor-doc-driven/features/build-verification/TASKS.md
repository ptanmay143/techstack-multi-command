# TASKS — F-06: Build and Lint Verification

### Story
As a maintainer, I want full validation of TypeScript compilation, linting, packaging, and tests to confirm zero regressions.

### Tasks
- [x] Task 6.1: Run TypeScript typecheck (`tsc --noEmit -p .`)
- [x] Task 6.2: Run ESLint (`npm run lint`)
- [x] Task 6.3: Run compilation and bundle packaging (`npm run package`)
- [x] Task 6.4: Run unit test suite (`npm test`)
- [x] Task 6.5: Run packaging (`npx @vscode/vsce package`)

### Verification
- Confirm all tasks pass with exit code 0.
