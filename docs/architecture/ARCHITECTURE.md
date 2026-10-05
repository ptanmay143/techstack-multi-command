# Architecture

## Status

Approved. This document is the source of truth for the Multi Command Runner extension.

## Goals

- Run any user-selected VS Code command on one file, multiple selected files, a folder's files, a workspace, or files matching a glob.
- Run either one command or an ordered sequence of commands against each target file.
- Offer Explorer context-menu entry points under a dedicated submenu, including for selected files and folders.
- Offer command-palette entry points for workspace and glob runs, with an optional folder run.
- Let users define reusable named workflows and control which file targets each workflow can process.
- Make bulk operations observable, cancellable, and safe by previewing the target set and reporting per-file outcomes.

## Non-goals

- Implement formatters, language servers, or code actions; workflows invoke commands provided by VS Code or installed extensions.
- Promise that every VS Code command can run unattended or against an arbitrary document. Commands can require an active editor, a selection, user input, or a particular language extension.
- Execute shell commands or arbitrary scripts. The unit of execution is a VS Code command identifier and its optional JSON arguments.
- Provide a fully dynamic native submenu with one contribution per user-defined workflow. VS Code extension menu contributions are declared statically; the proposed submenu opens a workflow picker so configured workflows can be listed dynamically.
- Modify files outside the resolved target set or suppress errors from commands that fail.

## Components

1. **Extension manifest and command contributions**
   - Declare the Explorer submenu and static command entry points.
   - Register command-palette actions for workspace, glob, and folder workflows.
   - Contribute configuration for workflow definitions and safe file-discovery defaults.
2. **Workflow configuration**
   - Read named workflows from VS Code user/workspace settings.
   - A workflow contains an ordered list of `{ command, args? }` steps plus optional include/exclude globs and execution preferences.
   - Offer a Quick Pick when the user invokes a generic context-menu or bulk-run command; the picker shows configured workflow labels and descriptions.
3. **Target resolver**
   - Resolve Explorer-selected files directly and recursively enumerate selected folders.
   - Resolve workspace and glob scopes across one or more workspace folders.
   - Apply workflow filters, VS Code exclusions, built-in protected-directory exclusions, and optional Git-ignore filtering before execution.
   - Deduplicate URIs and present a preview with target count before processing.
4. **Sequential execution engine**
   - Process files one at a time by default, opening each document and showing it in an editor when required by commands.
   - Run all workflow steps in configured order for each file. Await each command before advancing.
   - Save only according to the workflow's save policy; do not silently close or discard editors.
   - Provide progress, cancellation between steps/files, and structured per-file success/failure results.
5. **Output and progress**
   - Use a dedicated Output channel for target summaries, command errors, and completion counts.
   - Show VS Code progress for long-running operations and a concise completion notification with an option to open the output.

## Data model

### Workflow setting

Proposed setting: `multiCommandRunner.workflows`, an object keyed by stable workflow name.

```json
{
  "multiCommandRunner.workflows": {
    "Format and organize": {
      "label": "Format and organize",
      "description": "Format each file, then organize imports",
      "steps": [
        { "command": "editor.action.formatDocument" },
        { "command": "editor.action.organizeImports" }
      ],
      "include": ["**/*.{ts,tsx,js,jsx}"],
      "exclude": ["**/generated/**"],
      "save": "afterWorkflow"
    }
  }
}
```

Fields:

- `label` and `description` are optional picker text; the key is the fallback label.
- `steps` is a non-empty, ordered array of command identifiers and optional JSON-compatible positional argument arrays, passed to VS Code's command execution API.
- `include` and `exclude` are optional glob filters intersected with the selected execution scope.
- `save` is one of `afterEachStep`, `afterWorkflow`, or `never`; proposed default is `afterWorkflow`.
- A workflow may optionally specify whether to prompt before running. Destructive commands remain the user's responsibility; preview and confirmation are enabled by default for bulk runs.

### Run

An in-memory run contains its scope (selected resources, workspace, folder, or glob), resolved document URIs, current file and step, cancellation state, and per-file outcome. Run state is not persisted.

## APIs and user-facing commands

### Context menu

- Explorer: a submenu such as **Run File Workflow** on file and folder resources, using VS Code's static `contributes.menus` submenu mechanism.
- The submenu's generic **Run Workflow…** action opens a Quick Pick populated from configured workflows; the selected Explorer resources define the scope.
- For a selected folder, files are discovered recursively. For selected files, only those files are processed, subject to workflow filters.
- Since menu contributions are static, a dynamic one-menu-item-per-workflow design is not assumed. If the picker UX is not acceptable, that is an architecture decision to revisit before implementation.

### Command palette

- **Run Workflow on Workspace…**
- **Run Workflow on Glob…** (prompts for a glob, then workflow)
- **Run Workflow on Folder…** (prompts for a folder when not invoked on one)
- Optional keybinding support comes naturally from contributed commands.

### Execution contract

- Resolve and preview targets before changing documents.
- For each file: open/show the document, run each command with its arguments in sequence, then save according to policy.
- A failed command stops the remaining steps for that file, records the failure, and continues to the next file unless the user cancels.
- Cancellation prevents starting further steps/files. Already-applied edits are not rolled back.
- Existing open editor documents are not closed by the extension. Restoration of the previously active editor is attempted after a run, without promising to reverse command side effects.

## Security and safety

- Only commands explicitly configured by the user are invoked; command identifiers and arguments are treated as trusted settings, not as safe merely because they are valid JSON.
- Never invoke a shell or interpolate file paths into shell commands.
- Keep `.git` excluded regardless of user glob configuration. Recommend excluding common generated/dependency folders by default, with explicit preview of all targets.
- Confirm bulk runs and show an inspectable target list before execution; clearly state that command effects cannot be rolled back.
- Honor VS Code cancellation and workspace trust. Do not bypass VS Code's Workspace Trust restrictions.
- Log command IDs and file URIs to the local Output channel; avoid logging document contents or command argument values that may contain sensitive data.
- Treat invalid workflow definitions, invalid globs, inaccessible files, and command failures as visible errors with actionable diagnostics.

## Deployment

- Package as a standard VS Code extension using the Extension API and TypeScript.
- Publish/install as a `.vsix` built with `vsce`; no external runtime service is required.
- Target the VS Code version that supports submenu contributions and the APIs selected during implementation; set and test an explicit `engines.vscode` minimum.
- Keep runtime dependencies minimal; prefer VS Code APIs for file discovery, document editing, progress, configuration, and command execution.
- Maintain user-facing setup and usage documentation in `docs/USER_GUIDE.md`. The project README is intentionally out of scope and must remain untouched.

## Constraints

- VS Code menu contributions are static manifest entries; runtime settings cannot directly add arbitrary submenu entries.
- Many editor commands rely on an active text editor and may show their own dialogs or alter editor focus. Sequential invocation cannot make all commands headless.
- `workspace.findFiles` and `workspace.fs` are the intended discovery abstractions, but Git-ignore behavior may require an optional Git extension API integration or a separately evaluated implementation. No shell-based `git` execution is proposed.
- Folder and file selection arguments vary by VS Code menu surface. Explorer behavior is the required initial surface; SCM and editor-tab surfaces need separate validation.
- Large workspaces require cancellation, progress updates, bounded UI updates, and a preview that remains usable for large target counts.
- A workflow can include commands that are not idempotent or that produce effects beyond the target document. Preview and confirmation reduce accidental execution but cannot guarantee reversibility.

## Risks

- **Command compatibility:** An arbitrary command may fail when invoked without a specific editor state or may act on a different active resource. Mitigation: clearly document editor focus semantics, execute one file at a time, and report the file/step that failed.
- **Editor-state disruption:** Opening each file can affect tabs, focus, and user-visible editor state. Mitigation: preserve pre-existing editors, avoid closing documents, and restore the prior active editor when possible.
- **Unexpected modifications:** A workflow may modify and save many files. Mitigation: preview, confirmation, explicit save policy, cancellation, and per-file reporting.
- **Large target sets:** Previewing or processing huge workspaces may be slow. Mitigation: streaming/batched resolution where possible, progress reporting, cancellation, and configurable exclusions.
- **Git-ignore semantics:** A matching Git extension API may not be installed or available for all workspace folders. Mitigation: make Git-ignore support optional and state when it cannot be applied; never silently claim that ignored files were excluded.
- **Dynamic-menu expectations:** Users may expect every workflow as a direct submenu item. Mitigation: default to a static submenu entry with a dynamic Quick Pick and ask for approval of this UX before implementation.

## Recommended features

### Initial release

- Named workflows with ordered command steps and optional command arguments.
- Explorer multi-file and folder context-menu execution, plus workspace and prompted-glob execution.
- Workflow-specific include/exclude filters and conservative default directory exclusions.
- Target preview and confirmation for bulk runs.
- Per-run progress, cancellation, Output-channel diagnostics, and per-file success/failure summary.
- Save policy and preservation of already-open editors (never auto-close them).
- Multi-root workspace support.

### Follow-up candidates

- **SCM context menu** for selected changed files, after validating resource argument behavior.
- **Editor tab context menu** for a single file.
- A workflow-management UI or contributed snippets to make JSON settings easier to author.
- Optional Git-ignore filtering through the built-in Git extension API, with explicit unavailable-state reporting.
- Dry-run export of the target file list and a configurable concurrency mode only if command/editor semantics can be preserved safely.

## Open questions

1. Is a submenu entry that opens a picker of configured workflows acceptable, given that VS Code does not support dynamic contribution of a menu item per configured workflow?
2. Should workflow definitions live only in user/workspace `settings.json` for the first release, or should implementation include a dedicated workflow editor UI?
3. Should the first release support only Explorer context menus, or also SCM and editor-tab menus?
4. Should Git-ignore filtering be included in the first release, with a clear fallback when the built-in Git extension API is unavailable?
5. Is the proposed default of preview + confirmation for bulk runs and save-after-workflow acceptable?
