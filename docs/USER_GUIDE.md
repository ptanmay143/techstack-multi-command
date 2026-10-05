# TechStack Multi Command Executor

TechStack Multi Command Executor runs a configured VS Code command, or an ordered sequence of commands, against selected files, a folder, a workspace, or a glob. Commands are provided by VS Code or installed extensions; this extension does not implement formatters itself.

## Configure a workflow

Add workflows to your VS Code user or workspace settings:

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

Each workflow is keyed by a stable name and requires a non-empty `steps` array. Every step names a VS Code command and may include JSON-compatible positional `args`. Optional `label`, `description`, `include`, `exclude`, and `save` fields are supported. Include patterns restrict the targets; exclude patterns remove matching targets.

The save policy can be:

- `afterWorkflow` (default): save after all steps for a file succeed.
- `afterEachStep`: save after each successful command.
- `never`: do not save automatically.

## Run a workflow

- In Explorer, right-click one or more files or folders and choose **Run File Workflow → Run Workflow...**. Select a workflow, inspect the resolved target list, and confirm before it runs.
- Run **TechStack Multi Command Executor: Run Workflow on Workspace...** from the Command Palette to target files in all open workspace folders.
- Run **TechStack Multi Command Executor: Run Workflow on Glob...** to enter a workspace-relative glob, then choose a workflow.
- Run **TechStack Multi Command Executor: Run Workflow on Folder...** to select a folder and choose a workflow.

Explorer selections are filtered by the chosen workflow. Folders are searched recursively. `.git` and the configured excluded directories are omitted; VS Code file exclusions are also honored. Workspace and glob runs require an open workspace.

## Safety and command behavior

- The preview lists up to 500 targets; the Output panel lists the full resolved set. Confirmation is required before commands run. Dismissing the preview or confirmation cancels the run.
- A progress notification reports the current file and supports cancellation. Cancellation is checked between files and command steps. A VS Code command already running must finish before cancellation takes effect.
- Cancellation does not undo edits. With `afterWorkflow`, edits from an incomplete or failed sequence remain unsaved for review. With `afterEachStep`, earlier successful steps may already be saved.
- Each file is processed sequentially with its document active. Commands that need a selection, a particular language extension, or user interaction may behave differently or fail; arbitrary commands are not guaranteed to run unattended.
- Documents opened by the extension are not automatically closed. The previous active editor is restored when possible.
- The Output panel contains target paths, command failures, cancellation outcomes, editor-restoration warnings, and run totals. It does not log document contents or command argument values.

## Build and test

Use Node.js and npm:

```powershell
npm install
npm test
npm run test:extension
vsce package
```

Install a locally built package with:

```powershell
code --install-extension .\techstack-multi-command-0.0.1.vsix
```

The extension requires the VS Code version declared by `engines.vscode` in `package.json`.
