# Tasks: Workflow execution

## Status

Complete. Stories 1–5 are implemented and verified locally. Per user direction, README.md remains untouched.

## Story 1: Extension scaffold and workflow configuration

### Tasks

- [x] Create the extension manifest, TypeScript entry point, build scripts, and test harness.
- [x] Define typed workflow and command-step models.
- [x] Add settings schema for workflows, filters, exclusions, and save policy.
- [x] Implement workflow parsing and validation with explicit diagnostics.
- [x] Contribute public commands and the static Explorer submenu entry.
- [x] Implement workflow Quick Pick population from valid configured workflows.

### Verification

- [x] Build and type-check the extension.
- [x] Unit-test valid, missing, and malformed workflow definitions.
- [x] Confirm command and menu contributions are visible in Extension Development Host.

## Story 2: Target resolution and preview

### Tasks

- [x] Implement selected-file and selected-folder target resolution.
- [x] Implement workspace and prompted-glob target resolution for multi-root workspaces.
- [x] Apply URI deduplication, workflow filters, VS Code exclusions, `.git`, and default excluded directories.
- [x] Implement a bulk target preview and confirmation/cancel decision.

### Verification

- [x] Test selected resources, recursive folders, multi-root targets, and glob scopes.
- [x] Test include/exclude intersection, duplicate URIs, and protected-directory exclusions.
- [x] Ensure dismissing the preview returns a cancelled decision; command execution remains gated for Story 3.

## Story 3: Sequential per-file execution

### Tasks

- [x] Implement document activation and command-step execution with arguments.
- [x] Implement save policies, defaulting to save after the workflow completes.
- [x] Record command failures per file and step, skip remaining steps for that file, and continue to the next file.
- [x] Preserve existing documents without auto-closing and attempt to restore the previously active editor.
- [x] Add run outcome types and structured diagnostic output.

### Verification

- [x] Use deterministic test commands to assert exact command order and per-file sequencing.
- [x] Test that a failed step prevents later steps for that file but does not block later files.
- [x] Test each save policy and that no pre-existing document is auto-closed.
- [x] Verify failure results identify file and step without document contents.

## Story 4: Bulk commands, progress, and cancellation

### Tasks

- [x] Connect the Explorer submenu action to selected resources, workflow selection, preview, and execution.
- [x] Implement workspace and prompted-glob command-palette flows.
- [x] Add progress reporting and cancellation checks between command steps and files.
- [x] Add final notifications and success/failure/cancelled summaries.
- [x] Handle no-workspace and empty-target cases with actionable messages.

### Verification

- [x] Test selected files/folders and multi-resource resolution; verify all contributed entry-point commands register.
- [x] Test workspace and glob target resolution across multiple workspace folders.
- [x] Test cancellation before execution and mid-run; verify no subsequent steps/files start.
- [x] Verify executor progress callbacks and success, partial-failure, and cancellation result states; final notifications use these results.

## Story 5: Packaging and release readiness

### Tasks

- [x] Add `docs/USER_GUIDE.md` with workflow examples, command IDs, settings, limitations, and safety behavior; leave README.md untouched.
- [x] Confirm VS Code 1.85.0 as the minimum supported version and set `engines.vscode` to `^1.85.0`.
- [x] Run automated tests and static checks on Windows.
- [x] Package the extension as a `.vsix` with `vsce`.
- [x] Install the package in a clean VS Code environment and smoke-test the MVP flows.

### Verification

- [x] Automated test suite and production build pass.
- [x] VSIX packaging succeeds with required production dependencies and runtime files.
- [x] Clean-profile installation succeeds; packaged extension tests pass on VS Code 1.140.0 and a compatibility smoke test passes on VS Code 1.85.0.
- [x] User guide describes known limitations and does not promise rollback or universal command compatibility.
