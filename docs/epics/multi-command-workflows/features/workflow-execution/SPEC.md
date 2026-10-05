# Feature Specification: Workflow execution

## Status

Approved. Stories 1–3 are implemented; Story 4 is pending approval.

## References

- [Architecture](../../../architecture/ARCHITECTURE.md)
- [Multi-command workflows epic](../../EPIC.md)

## Problem

VS Code commands such as document formatting and organize imports normally operate on the active editor. Users who need to apply those commands repeatedly must manually open each file, invoke commands, and save. Existing extensions demonstrate workspace-wide command execution, file/folder formatting, and Explorer context-menu invocation, but this feature combines these into configurable workflows that can run against selected resources or a broader target set.

## Requirements

### Workflow configuration

- **FR-1:** A user can define multiple named workflows in user or workspace settings.
- **FR-2:** Each workflow contains one or more ordered command steps. Each step has a command identifier and optional JSON arguments.
- **FR-3:** A workflow may declare include and exclude glob patterns and a save policy.
- **FR-4:** Invalid or incomplete workflow definitions are surfaced with the workflow name and a useful reason; they are not silently skipped.
- **FR-5:** Workflow names and labels are presented in a Quick Pick with useful descriptions when available.

### Target selection

- **FR-6:** From Explorer, a user can invoke a contributed submenu action on selected files and folders and choose a configured workflow.
- **FR-7:** Selected files are processed directly. Selected folders are traversed recursively.
- **FR-8:** The user can invoke workspace and prompted-glob workflows from the Command Palette.
- **FR-9:** All scopes support multi-root workspaces, deduplicate target URIs, apply workflow filters, and exclude `.git` and configured default excluded directories.
- **FR-10:** VS Code workspace exclusions are respected. Git-ignored file exclusion is not promised in this release.

### Execution

- **FR-11:** Before a bulk run starts, the extension shows the target set or a usable summary and requests confirmation. The user can cancel at this stage without changes.
- **FR-12:** Files are handled sequentially. For each file, the extension opens/shows the document as needed, awaits each configured command in order, and saves according to the workflow policy.
- **FR-13:** A failed command stops subsequent steps for that file, records the failing file and step, and processing continues with the next file unless cancelled.
- **FR-13a:** With `afterWorkflow`, edits are saved only when every step for that file succeeds; partial edits after a failure remain unsaved for review. With `afterEachStep`, completed-step edits are saved as they occur, while edits made by the failing step remain unsaved.
- **FR-14:** Cancellation prevents new files and steps from starting. The extension does not claim to undo changes already made.
- **FR-15:** The extension does not automatically close editors/documents. After a run it attempts to restore the previously active editor.
- **FR-16:** Progress and completion status are visible; the Output channel includes target summary and actionable per-file errors without logging document contents.

### Extension behavior

- **FR-17:** Extension commands are contributed for Explorer selection, workspace execution, and glob execution. Command IDs and titles are documented.
- **FR-18:** Workflows execute VS Code command IDs only; the extension does not spawn a shell or execute scripts.
- **FR-19:** When no workspace is open, workspace/glob execution presents a clear error; Explorer-selected file execution may still work if VS Code supplies the resource.

## User stories

- As a developer, I can define a workflow with Format Document followed by Organize Imports and run it over a workspace.
- As a developer, I can right-click selected files or a folder in Explorer, choose a workflow, preview its targets, and run it.
- As a developer, I can use a glob such as `src/**/*.ts` to limit a workflow to a subset of a workspace.
- As a developer, I can cancel a long run and see which files completed or failed.
- As a developer, I can choose whether workflow edits are saved and trust that the extension will not close my existing editor tabs.

## Acceptance criteria

1. A valid workflow with one step and one with multiple steps can be loaded from settings and shown in the picker.
2. A workflow with no steps, a missing command identifier, invalid filter patterns, or an unsupported save policy produces an actionable validation error.
3. In an automated Extension Development Host test, selecting files processes only those resources that pass filters; selecting a folder additionally includes eligible descendants.
4. Workspace and glob runs include eligible files across all workspace folders, deduplicate targets, honor workspace exclusions, and omit `.git` and default excluded directories.
5. A stub/test command verifies that each file's command steps run in order and that the next file does not begin before that file's sequence completes.
6. A failed step is reported with the affected file and step; subsequent steps for that file do not run; later files are still attempted.
7. The preview permits cancellation before execution. Mid-run cancellation stops further work and reports completed and unstarted files.
8. Save policy is honored; `afterWorkflow` is the default. A failed workflow leaves partial edits unsaved under `afterWorkflow`; `afterEachStep` persists only completed steps. An editor/document that was already open is not auto-closed, and active-editor restoration is tested where supported.
9. Progress, final counts, and failures are visible to the user, and diagnostics do not include file contents.
10. The extension builds and packages as a `.vsix` on Windows, and automated tests cover configuration validation, target resolution, execution sequencing, cancellation, and save decisions.

## Data changes

No external or durable runtime storage is introduced. Workflow data lives in VS Code user/workspace settings under `multiCommandRunner.workflows` using the shape defined in [Architecture](../../../architecture/ARCHITECTURE.md). Per-run progress and outcomes are transient.

## API changes

No network or external service API. The extension contributes:

- An Explorer submenu with a static **Run Workflow…** action that opens a workflow picker.
- Command Palette commands for workspace, glob, and folder execution.
- `multiCommandRunner.workflows` and relevant discovery/exclusion settings.
- Internal TypeScript interfaces for workflow definitions, command steps, resolved targets, execution progress, and results.

Exact command IDs, setting defaults, and the minimum `engines.vscode` version are to be finalized in the implementation plan after API compatibility checks.

## Constraints

- VS Code contributes menu entries statically; configured workflows are listed in an extension-owned picker, not as dynamically contributed submenu commands.
- Some commands require a visible active editor, prompt for user input, or act beyond the current document. The feature cannot guarantee compatibility or reversibility for all command IDs.
- Commands are awaited sequentially, but commands may create their own UI or have external side effects.
- Git-ignore filtering is excluded from the MVP.
- Extension Development Host tests may not accurately simulate every third-party command or all editor/tab restoration behavior.

## Risks

- A configured command might operate on the wrong editor/resource if it changes focus or does not follow the active-editor convention.
- Running a non-idempotent command over many documents may have broad, irreversible effects even with a preview.
- Large file sets can make discovery and preview unwieldy.
- Command argument shapes are command-specific and cannot be statically validated in general.

## Out of scope

- Workflow editor UI, marketplace publishing, SCM/editor-tab context menus, command rollback, per-file concurrency, shell execution, or guaranteed execution without visible editor activation.
- Automatic discovery or validation of command IDs against all installed extensions.
