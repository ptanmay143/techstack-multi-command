# Changelog: Workflow execution

## Unreleased

- Added the VS Code extension scaffold, command and Explorer submenu contributions, workflow settings schema, validation, workflow picker, and initial tests.
- Added Extension Development Host tests and a clean VSIX packaging configuration.
- Added multi-root target discovery for selected files/folders, workspace and glob scopes, include/exclude and workspace filters, protected-directory exclusions, target preview and confirmation.
- Added sequential per-file command execution, save-policy behavior, structured failure reporting, and active-editor restoration.
- Connected Explorer, workspace, glob, and folder flows to workflow execution with per-file progress, cancellation between commands/files, and complete run summaries.
- Added explicit cancelled/not-started outcomes and actionable no-workspace handling.
- Added user-facing documentation in `docs/USER_GUIDE.md`; left README.md untouched per user direction.
- Packaged and isolated-installed version 0.0.1, with full packaged Extension Host tests on VS Code 1.140.0 and a minimum-version compatibility smoke test on VS Code 1.85.0.
- Updated package identity to `techstack-multi-command` / `TechStack Multi Command Executor`.
- Added documentation-first architecture, epic, specification, implementation plan, and task breakdown.
