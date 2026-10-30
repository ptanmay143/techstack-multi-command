# Epic Changelog: E-02 refactor-doc-driven

## [1.2.0] - 2026-10-31
### Added
- Complete Doc-Driven Development hierarchy and architecture documentation.
- `esbuild` configuration (`esbuild.js`) for bundled extension compilation.
- `eslint.config.mjs` TypeScript-ESLint linting configuration with zero violations.
- `.vscode/` developer workspace configuration (`launch.json`, `tasks.json`, `settings.json`).
- Release notes for version 1.2.0 (`docs/releases/1.2.0.md`).

### Changed
- Point extension `"main"` entry to `dist/extension.js`.
- Update npm build scripts to integrate type checking, linting, and esbuild bundling.
- Updated `.vscodeignore` and `.gitignore` to track `dist/` properly.
