# Implementation Plan: Workflow execution

## Status

Approved. Stories 1–5 are complete and verified locally.

## References

- [Architecture](../../../../architecture/ARCHITECTURE.md)
- [Epic](../../EPIC.md)
- [Feature specification](./SPEC.md)

## Implementation strategy

Implement the MVP in small vertical stories, keeping workflow validation and target resolution independent from editor command execution where practical. Use the VS Code Extension API and TypeScript. Add tests alongside each story, then validate integration in an Extension Development Host and package the extension with `vsce`.

### Story 1: Extension scaffold and workflow configuration

- Create the TypeScript extension entry point, manifest, build scripts, and test harness.
- Define and validate `multiCommandRunner.workflows` using VS Code configuration APIs.
- Contribute command identifiers, titles, settings schema, and the static Explorer submenu/picker action.
- Keep validation errors explicit and avoid silently dropping malformed workflows.

### Story 2: Target resolution and preview

- Implement a testable resolver for selected resources, folders, workspace folders, and glob scopes.
- Apply include/exclude filters, VS Code workspace exclusions, deduplication, and default protected-directory exclusions.
- Add preview and confirmation before bulk execution.
- Test multi-root resolution and filtering without invoking document commands.

Story 2 is complete. The resolver uses VS Code file discovery for workspace-backed scopes, filesystem APIs for selected folders outside the open workspace, and Windows-safe relative path matching for workflow filters.

### Story 3: Sequential per-file execution

- Implement single-file workflow execution: open/show document, run configured commands sequentially, save according to policy, and preserve pre-existing open documents.
- Isolate command errors by file and step and continue to later files as specified.
- Save under `afterWorkflow` only after all steps succeed; leave failed-workflow edits unsaved for review.
- Attempt active-editor restoration, without closing documents or claiming rollback.
- Test command ordering, error handling, save decisions, and editor state using the Extension Development Host where necessary.

### Story 4: Bulk commands, progress, and cancellation

- Connect Explorer selection, workspace, and glob entry points to the resolver and executor.
- Add Quick Pick workflow selection, progress/cancellation, Output-channel summaries, and completion notifications.
- Verify cancellation before a run and while processing, including accurate completed/failed/unstarted counts.

### Story 5: Packaging and release readiness

- Run all automated tests and static checks on Windows.
- Verify manifest contributions and settings in an Extension Development Host.
- Build a `.vsix`, install it into a clean VS Code profile or test instance, and smoke-test the main workflows.
- Document setup, workflow configuration, limitations, safety behavior, and packaging in `docs/USER_GUIDE.md`. The project README is intentionally excluded and remains untouched.

## Migration

No existing extension, persisted data, or public API is present in this new project. No migration is planned. The initial workflow setting is a new public configuration contract; validate its schema and naming before release and preserve backward compatibility after publication.

## Testing

- Unit tests: workflow schema and validation, glob/filter combination, protected-directory exclusions, URI normalization/deduplication, run-state transitions, and save-policy selection.
- Extension tests: command registration, configuration loading, Explorer resource arguments, multi-root workspace/glob target resolution, sequential command invocation, error continuation, progress/cancellation, and editor preservation.
- Test commands should use registered test commands or stubs so command order and invocation context are deterministic; do not assume all third-party commands can be automated.
- Manual Extension Development Host checks: Explorer submenu visibility and multi-selection behavior, Quick Pick labels, preview readability, active-editor restoration, cancellation UX, and Output-channel reporting.
- Packaging checks: `npm test`, production build, and `vsce package` on Windows, plus installation/smoke test of the resulting `.vsix`.

## Deployment

- Produce a versioned `.vsix` using the installed `vsce`.
- Initially distribute as an installable local package; marketplace publication is not part of this plan.
- Declare the verified minimum VS Code version in `engines.vscode`.
- Keep user-facing usage guidance in `docs/USER_GUIDE.md`; do not edit or rewrite the project README.
- Revisit Git-ignore integration and SCM/editor-tab menus only as separately scoped follow-up features.

## Risks and mitigations

- Confirm the exact context arguments delivered to an Explorer submenu action using Extension Development Host tests before finalizing the command handler.
- Verify relevant menu contribution and testing APIs against the selected VS Code engine before implementing; update the architecture and seek approval if a material design change is required.
- Never run commands concurrently across files; command execution and focus are editor-state dependent.
- Make target previews scalable: show an inspectable list for manageable counts and an accurate count plus representative paths for large sets, with detailed targets available in Output.
- Keep operations cancellable between awaited command steps/files, and make clear that cancellation does not roll back edits already made.
