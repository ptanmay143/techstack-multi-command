# Epic: Multi-command workflows

## Status

Implemented and verified locally. Marketplace publication is out of scope.

## Objective

Deliver a VS Code extension that runs user-configured single-command or sequential-command workflows across selected Explorer files/folders, a workspace, or a glob. The extension reuses commands from VS Code and installed extensions rather than implementing formatters or language-specific code actions.

## Scope

### In scope

- TypeScript-based VS Code extension with an explicit minimum supported VS Code version.
- Named workflow configuration in VS Code user/workspace settings.
- Each workflow has an ordered non-empty list of VS Code command IDs, optional JSON arguments, optional include/exclude globs, and a save policy.
- Explorer context-menu submenu that launches a workflow picker for selected files or folders.
- Command-palette commands for workspace and prompted-glob runs; support multi-root workspaces.
- Recursive file discovery for selected folders, with common dependency/generated folders and `.git` excluded by default.
- Resolve the target list before execution and preview/confirm bulk operations.
- Sequential per-file command execution, save-after-workflow by default, cancellation, progress, output logging, and per-file result reporting.
- Do not auto-close documents; attempt to restore the previously active editor after execution.
- Validation and actionable errors for invalid workflow configuration, missing target files, and command failures.

### Out of scope for the MVP

- Dedicated visual workflow editor.
- SCM and editor-tab context menus.
- Dynamic direct menu items for each configured workflow.
- Shell/script execution, automatic rollback, or guaranteed headless execution of arbitrary commands.
- Concurrent per-file execution.
- Git-ignore integration; reconsider once a reliable API/fallback and user-visible behavior are specified.

## Features

1. **Workflow definition and selection**
   - Define, validate, and list named workflows in settings.
   - Select workflows through a Quick Pick from the Explorer submenu and bulk commands.
2. **Explorer selection execution**
   - Run a workflow on one or more selected files and recursively discovered files beneath selected folders.
   - Respect the selected resources as the outer scope and intersect them with workflow filters.
3. **Workspace and glob execution**
   - Run a workflow across workspace folders or a user-provided glob.
   - Respect VS Code workspace exclusions and default protected-directory exclusions.
4. **Execution safety and observability**
   - Preview/confirm bulk targets, display progress, support cancellation, and report outcomes.
   - Execute each file's workflow sequentially and save according to its declared policy.
5. **Packaging and validation**
   - Build and package a `.vsix`.
   - Test workflow validation, target resolution, command sequencing, cancellation, save behavior, and menu/command registration against the declared VS Code engine.

## Dependencies

- Approved [architecture](../../architecture/ARCHITECTURE.md).
- VS Code Extension API for commands, menus, Quick Pick, workspace file discovery, text documents/editors, progress, cancellation, configuration, and Output channels.
- VS Code command identifiers supplied by built-in functionality or installed extensions.
- Node.js, TypeScript, and `vsce` for build/package workflows.

## Risks

- Arbitrary commands may depend on the active editor or prompt for input, so behavior may vary across commands and extensions.
- Opening files to provide an editor context can alter focus and visible editor state.
- Bulk command effects are not automatically reversible; a workflow may modify more than its current file.
- Very large target sets can make preview and execution costly.
- Git-ignore behavior is excluded from the MVP, so users may need explicit excludes for ignored files.

## Success criteria

- A user can configure one workflow with one command and another with an ordered sequence, then invoke either without creating a separate extension or script.
- Explorer invocation applies the chosen workflow only to the selected files/folder descendants that pass its filters.
- Workspace and glob invocations resolve multi-root targets and apply the same workflow filters.
- Bulk runs show a target preview before execution; users can cancel before changes begin and during processing.
- The run output reports every failed file/step and a final success/failure/cancelled count without hiding command errors.
- Files are saved according to workflow policy, no documents are auto-closed, and tests cover editor restoration behavior where the VS Code test host allows.
- The extension builds, passes automated tests, and produces an installable `.vsix` on Windows.
