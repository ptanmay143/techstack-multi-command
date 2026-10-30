# TASKS — F-05: .vscodeignore and .gitignore Updates

### Story
As a maintainer, I want git and vsce packaging ignore rules updated so that build artifacts and tooling files are properly filtered.

### Tasks
- [x] Task 5.1: Add `dist` to `.gitignore` custom rules
- [x] Task 5.2: Update `.vscodeignore` to include `!dist/extension.js` and exclude tooling/source files
- [x] Task 5.3: Verify file inclusion list using `npx @vscode/vsce ls`

### Verification
- `git status` ignores `dist/` directory.
- `vsce ls` includes `dist/extension.js` and excludes unnecessary dev assets.
