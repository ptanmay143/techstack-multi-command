# ARCHITECTURE.md — TechStack Multi Command Executor

## Status

Approved. This document is the source of truth for the TechStack Multi Command Executor extension.

---

## Goals

- Run any user-selected VS Code command on one file, multiple selected files, a folder's files, a workspace, or files matching a glob.
- Run either one command or an ordered sequence of commands against each target file.
- Offer Explorer context-menu entry points under a dedicated submenu, including for selected files and folders.
- Offer command-palette entry points for workspace and glob runs, with an optional folder run.
- Let users define reusable named workflows and control which file targets each workflow can process.
- Make bulk operations observable, cancellable, and safe by previewing the target set and reporting per-file outcomes.

---

## Non-Goals

- Implement formatters, language servers, or code actions; workflows invoke commands provided by VS Code or installed extensions.
- Promise that every VS Code command can run unattended or against an arbitrary document. Commands can require an active editor, a selection, user input, or a particular language extension.
- Execute shell commands or arbitrary scripts. The unit of execution is a VS Code command identifier and its optional JSON arguments.
- Provide a fully dynamic native submenu with one contribution per user-defined workflow. VS Code extension menu contributions are declared statically; the proposed submenu opens a workflow picker so configured workflows can be listed dynamically.
- Modify files outside the resolved target set or suppress errors from commands that fail.

---

## Components

### 1. Extension Entry Point (`src/extension.ts`)

Registers the four contributed commands and owns the top-level interaction flow:

- `multiCommandRunner.runWorkflowFromExplorer` — reads Explorer selection, picks a workflow, resolves and previews targets.
- `multiCommandRunner.runWorkflowOnWorkspace` — picks a workflow, resolves all workspace files.
- `multiCommandRunner.runWorkflowOnGlob` — prompts for a glob pattern, then picks a workflow.
- `multiCommandRunner.runWorkflowOnFolder` — accepts a folder URI (from Explorer) or prompts with an open-folder dialog.

Common helpers:
- `selectWorkflow()` — reads `multiCommandRunner.workflows` from settings, parses it, surfaces errors to the Output channel, and shows a Quick Pick.
- `resolveAndPreview()` — calls `resolveTargets()`, logs resolution errors, calls `previewTargets()`, and if confirmed calls `executeWorkflowOnTargets()`.

### 2. Workflow Configuration (`src/workflows.ts`)

Pure data layer — no VS Code API dependencies. Defines:

- `JsonValue` — recursive JSON-compatible value type.
- `SavePolicy` — `"afterEachStep" | "afterWorkflow" | "never"`.
- `CommandStep` — `{ command: string; args?: JsonValue[] }`.
- `Workflow` — `{ name, label?, description?, steps, include?, exclude?, save }`.
- `WorkflowParseResult` — `{ workflows: Workflow[]; errors: string[] }`.
- `parseWorkflows(value: unknown): WorkflowParseResult` — validates raw settings input; collects errors per workflow; retains valid workflows alongside errors.

### 3. Target Resolver (`src/targetResolver.ts`)

Resolves a `TargetScope` to a deduplicated, filtered list of file URIs. Scopes:

| Scope kind | Source |
|---|---|
| `selected` | Explorer-selected URIs (files passed through, folders expanded recursively) |
| `workspace` | All workspace folders enumerated via `workspace.findFiles("**/*")` |
| `glob` | `workspace.findFiles(pattern)` |
| `folder` | `workspace.findFiles("**/*", undefined)` within the given base |

Filtering pipeline (applied in order):

1. Exclude `.git` directory (always).
2. Exclude configured `excludedDirectories` (normalised, case-insensitive on Windows).
3. Exclude resources matching `files.exclude` workspace settings.
4. Apply workflow `include` patterns (if present).
5. Apply workflow `exclude` patterns (if present).
6. Deduplicate by resolved file path; prefer the shorter/closer workspace root.

Returns `{ targets: vscode.Uri[]; errors: string[] }`. Errors surface inaccessible selected resources; they do not abort resolution.

### 4. Sequential Execution Engine (`src/workflowExecutor.ts`)

Processes targets one at a time. For each file:

1. Check cancellation.
2. Open the document (`workspace.openTextDocument`).
3. Show it in an editor (`window.showTextDocument`).
4. Execute each `CommandStep` in order (`commands.executeCommand`). Re-shows the document if focus has shifted.
5. Save according to `SavePolicy` (`afterEachStep` saves after each successful step; `afterWorkflow` saves once after all steps; `never` leaves the document dirty).
6. On command failure: record failure, skip remaining steps for this file, continue to next file.
7. On cancellation: mark remaining files `notStarted`, stop loop.

After all files: attempt to restore the previously active editor.

Exports:
- `executeWorkflowOnTargets(targets, workflow, options?): Promise<WorkflowExecutionReport>`
- `WorkflowExecutionReport` — `{ files: FileExecutionResult[]; cancelled: boolean; editorRestoreError?: string }`
- `FileExecutionResult` — `{ uri; status; completedSteps; failure? }`

### 5. Target Preview (`src/targetPreview.ts`)

Shows a `QuickPick` listing the resolved targets (capped at 500 for display). On acceptance, shows a modal confirmation warning that effects cannot be rolled back. Returns `boolean` (confirmed or cancelled).

### 6. Output Channel

A single dedicated Output channel (`"TechStack Multi Command Executor"`) is created at activation and passed through the call chain. It records:

- Configuration errors.
- Target resolution errors.
- Resolved target count per workflow.
- Per-file completion / failure details (file path, step index, error message).
- Editor-restoration errors.
- Run summary (succeeded / failed / cancelled counts).

---

## Data Model

### Workflow Setting

`multiCommandRunner.workflows` — a `Record<string, WorkflowDefinition>` in VS Code settings.

```json
{
  "multiCommandRunner.workflows": {
    "formatAndOrganize": {
      "label": "Format and organize imports",
      "description": "Format supported source files, then organize imports",
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

- `label` and `description` — optional picker text; the key is the fallback label.
- `steps` — non-empty ordered array of `{ command, args? }`. `args` is a JSON-compatible array.
- `include` / `exclude` — optional glob filters intersected with the execution scope.
- `save` — `afterEachStep | afterWorkflow | never`. Default: `afterWorkflow`.

### `multiCommandRunner.excludedDirectories`

Array of directory name strings (default: `["node_modules", ".vscode", "dist", "out", ".venv"]`). `.git` is always excluded regardless of this setting.

### Run State

An in-memory `WorkflowExecutionReport` accumulates `FileExecutionResult` entries during a run. Run state is never persisted.

---

## APIs and User-Facing Commands

### Contributed Commands

| Command ID | Title | Entry Point |
|---|---|---|
| `multiCommandRunner.runWorkflowFromExplorer` | TechStack: Run Workflow | Explorer context submenu |
| `multiCommandRunner.runWorkflowOnWorkspace` | TechStack: Run Workflow on Workspace | Command palette |
| `multiCommandRunner.runWorkflowOnGlob` | TechStack: Run Workflow on Glob | Command palette |
| `multiCommandRunner.runWorkflowOnFolder` | TechStack: Run Workflow on Folder | Command palette |

### Contributed Submenu

- `multiCommandRunner.workflowMenu` — appears in `explorer/context` when `resourceScheme == file`.

### Activation Events

- `onCommand:multiCommandRunner.runWorkflowFromExplorer`
- `onCommand:multiCommandRunner.runWorkflowOnWorkspace`
- `onCommand:multiCommandRunner.runWorkflowOnGlob`
- `onCommand:multiCommandRunner.runWorkflowOnFolder`

### Execution Contract

1. Resolve and preview targets before changing any document.
2. For each file: open/show, run each step in order, save per policy.
3. A failed command stops remaining steps for that file; the next file begins.
4. Cancellation prevents new steps/files from starting; in-progress commands run to completion.
5. Existing open editors are never closed. The prior active editor is restored after a run (best-effort).

---

## Security and Safety

- Only commands explicitly configured by the user are invoked.
- No shell execution or path interpolation into shell commands.
- `.git` is always excluded; common generated/dependency folders excluded by default.
- Target preview and modal confirmation required before bulk execution.
- Command IDs and file URIs logged to the Output channel; document content and argument values are not logged.
- Workspace trust is honoured; VS Code handles trust restrictions at the API level.
- Invalid workflow definitions, globs, inaccessible files, and command failures produce visible diagnostics.

---

## Deployment

- Standard VS Code extension. TypeScript compiled with `tsc` (`commonjs` modules) to `out/`. Production bundle produced by `esbuild` → `dist/extension.js`.
- Main entry for production/VSIX: `./dist/extension.js`.
- Main entry for development/test: `./out/src/extension.js`.
- Published as `.vsix` via `@vscode/vsce`.
- Runtime dependency: `minimatch` (glob filtering). All other dependencies are `devDependencies`.
- Minimum VS Code engine: `^1.85.0` (required for submenu contribution API).
- No external services required.

---

## Build and Tooling

| Tool | Purpose |
|---|---|
| `esbuild` (`esbuild.js`) | Bundles `src/extension.ts` → `dist/extension.js`. Production build minifies; dev/watch builds include source maps. Added during this refactor. |
| `tsc` | Type-checking and test compilation. `rootDir: "."` covers both `src/` and `test/`; output goes to `out/`. |
| `eslint` (`eslint.config.mjs`) | TypeScript-ESLint with `recommendedTypeChecked`. Runs on `src/**/*.ts`. Added during this refactor. |
| `@vscode/test-electron` + `test/runTest.ts` | Launches VS Code Extension Development Host for integration tests in `test/suite/`. |
| Node built-in test runner | Runs unit tests (`test/workflows.test.ts`) without VS Code via `node --test out/test/*.test.js`. |
| `.vscode/` | Committed: `launch.json` (F5 debug configs), `tasks.json` (watch tasks), `settings.json` (hide generated output). Added during this refactor. |

### `.vscode/` Rationale

`.vscode/` is committed because these files define the **developer experience** for contributors — F5 launch configurations, default build tasks, and editor settings that hide generated output folders (`out/`, `dist/`). The `.gitignore` pattern `!.vscode/settings.json`, `!.vscode/tasks.json`, `!.vscode/launch.json` (from the VisualStudioCode gitignore template) whitelists these three files explicitly.

### `package.json` Script Changes (refactor additions)

| Script | Before | After |
|---|---|---|
| `vscode:prepublish` | `npm run compile` (tsc) | `npm run package` (esbuild production) |
| `compile` | `tsc -p .` | `tsc --noEmit && eslint src && node esbuild.js` |
| `package` | _(new)_ | `tsc --noEmit && eslint src && node esbuild.js --production` |
| `watch` | `tsc -watch -p .` | `npm-run-all -p watch:*` |
| `watch:esbuild` | _(new)_ | `node esbuild.js --watch` |
| `watch:tsc` | _(new)_ | `tsc --noEmit --watch` |
| `lint` | _(new)_ | `eslint src` |

---

## Constraints

- VS Code menu contributions are static manifest entries; runtime settings cannot directly add arbitrary submenu entries per workflow.
- Many editor commands rely on an active text editor and may show their own dialogs or alter focus.
- `workspace.findFiles` is the file-discovery abstraction; Git-ignore behaviour may differ from `git` CLI.
- Large workspaces require cancellation, progress updates, bounded UI updates, and a capped preview.
- Workflows can invoke non-idempotent commands.

---

## Risks

| Risk | Mitigation |
|---|---|
| Command compatibility | Document editor-focus semantics; execute one file at a time; report file/step on failure |
| Editor-state disruption | Preserve pre-existing editors; avoid closing documents; restore prior active editor |
| Unexpected modifications | Preview, confirmation, explicit save policy, cancellation, per-file reporting |
| Large target sets | Capped preview (500), streaming resolution, progress reporting, cancellation, configurable exclusions |

---

## Target Repository Layout

```
.vscode/                              ← committed (dev DX: launch, tasks, settings)
  launch.json
  tasks.json
  settings.json
docs/
  PROJECT_CONSTITUTION.md
  PROJECT_STATUS.md
  architecture/
    ARCHITECTURE.md                   ← this file
    ADR/
  roadmap/
    ROADMAP.md
  epics/
    EPIC_INDEX.md
    multi-command-workflows/
      EPIC.md
      STATUS.md
      CHANGELOG.md
      features/
        workflow-execution/
          SPEC.md
          PLAN.md
          TASKS.md
          IMPLEMENTATION.md
          CHANGELOG.md
icon/
  icon.png
src/
  extension.ts
  workflows.ts
  targetResolver.ts
  workflowExecutor.ts
  targetPreview.ts
test/
  workflows.test.ts
  runTest.ts
  suite/
    index.ts
    extension.test.ts
  fixtures/
    multi-root.code-workspace
    workspace-a/
    workspace-b/
.gitignore
.vscodeignore
esbuild.js                            ← added during refactor
eslint.config.mjs                     ← added during refactor
icon.png
LICENSE
package.json
README.md
tsconfig.json
```
