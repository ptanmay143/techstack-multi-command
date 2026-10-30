# TASKS — F-03: ESLint Integration

### Story
As a developer, I want consistent linting across TypeScript sources so that code quality and formatting match project standards.

### Tasks
- [x] Task 3.1: Add ESLint and typescript-eslint dependencies to `devDependencies`
- [x] Task 3.2: Create `eslint.config.mjs` targeting `src/**/*.ts`
- [x] Task 3.3: Add `"lint"` script to `package.json`
- [x] Task 3.4: Run `npm run lint` and fix any lint issues in `src/`
- [x] Task 3.5: Verify type safety remains intact (`tsc --noEmit`)

### Verification
- `npm run lint` exits with code 0.
