# SPEC — F-03: ESLint Integration

## Feature
E-02 / F-03 — ESLint Integration

## Status
Proposed → Approved

## Problem
`techstack-multi-command` has no ESLint configuration. `techstack-gitignore` uses `typescript-eslint` with `recommendedTypeChecked` rules. For consistency and code quality, the same ESLint setup should be applied.

## Requirements
1. Add to `devDependencies`: `eslint`, `@eslint/js`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `typescript-eslint`.
2. Create `eslint.config.mjs` — mirror `techstack-gitignore/eslint.config.mjs` exactly:
   - `eslint.configs.recommended`
   - `...tseslint.configs.recommendedTypeChecked`
   - `projectService: true`, `tsconfigRootDir: import.meta.dirname`
   - Files: `"**/*.ts"`
   - Rules: `@typescript-eslint/naming-convention` (import format), `curly`, `eqeqeq`, `no-throw-literal`, `semi`
3. Add `"lint"` script to `package.json`: `"eslint src"`.
4. Resolve all lint errors reported by `eslint src` in `src/**/*.ts`. Only rule violations are fixed — no logic changes.
5. Update `compile` and `package` scripts to include `eslint src` (see F-02 script table).

## Acceptance Criteria
- `eslint.config.mjs` exists at the project root.
- `npm run lint` exits 0 with no errors.
- `tsc --noEmit` still exits 0 after lint fixes (no accidental type regressions).
- `npm test` still exits 0.

## Data Changes
None.

## API Changes
None. Lint fixes are cosmetic (formatting, type assertion style) or minor (adding missing `curly` braces, enforcing `===`).

## Constraints
- No logic changes to `src/`. If a lint rule would require a logic change (e.g. `no-throw-literal` on a string throw), the rule may be disabled per-line with a comment and a TODO.
- `src/test/` and `test/` are not linted (ESLint config targets `src/**/*.ts` only, matching gitignore's pattern).

## Risks
| Risk | Mitigation |
|---|---|
| `recommendedTypeChecked` reports many errors in existing code | Fix mechanically (auto-fix where possible, manual where not); scope is limited to `src/` only |
| `no-throw-literal` fires on existing code | Assess each case; acceptable to add inline disable with TODO if a proper Error wrapping would change semantics |

## Out of Scope
- Linting `test/` files.
- Adding Prettier or other formatters.
- Enabling rules beyond what `techstack-gitignore` uses.
