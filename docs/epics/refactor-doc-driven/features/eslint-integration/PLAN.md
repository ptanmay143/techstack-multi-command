# PLAN — F-03: ESLint Integration

## Implementation Strategy
1. Install `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`, and `typescript-eslint` in `devDependencies`.
2. Create `eslint.config.mjs` matching the rules and structure from `techstack-gitignore`.
3. Add `"lint": "eslint src"` script to `package.json`.
4. Run `npm run lint` and resolve any reported lint violations in `src/` without changing runtime logic.

## Migration
None. Code quality enhancement only.

## Testing
Run `npm run lint` to verify 0 errors. Run `tsc --noEmit` and `npm test` to ensure no regressions.

## Deployment
Committed to codebase.
