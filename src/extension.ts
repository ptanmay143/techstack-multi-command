import * as vscode from "vscode";
import { previewTargets } from "./targetPreview";
import { resolveTargets, TargetScope } from "./targetResolver";
import { executeWorkflowOnTargets, WorkflowExecutionReport } from "./workflowExecutor";
import { parseWorkflows, Workflow } from "./workflows";

const COMMANDS = {
	fromExplorer: "multiCommandRunner.runWorkflowFromExplorer",
	onWorkspace: "multiCommandRunner.runWorkflowOnWorkspace",
	onGlob: "multiCommandRunner.runWorkflowOnGlob",
	onFolder: "multiCommandRunner.runWorkflowOnFolder"
} as const;

export function activate(context: vscode.ExtensionContext): void {
	const output = vscode.window.createOutputChannel("TechStack Multi Command Executor");
	context.subscriptions.push(output);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			COMMANDS.fromExplorer,
			async (resource?: vscode.Uri, selectedResources?: vscode.Uri[]) => {
				const workflow = await selectWorkflow(output);
				if (!workflow) {
					return;
				}
				const resources = selectedResources?.length
					? selectedResources
					: resource
						? [resource]
						: [];
				if (resources.length === 0) {
					void vscode.window.showErrorMessage("Select a file or folder in Explorer before running a workflow.");
					return;
				}
				await resolveAndPreview({ kind: "selected", resources }, workflow, output);
			}
		),
		vscode.commands.registerCommand(COMMANDS.onWorkspace, async () => {
			const workflow = await selectWorkflow(output);
			if (workflow) {
				await resolveAndPreview({ kind: "workspace" }, workflow, output);
			}
		}),
		vscode.commands.registerCommand(COMMANDS.onGlob, async () => {
			const pattern = await vscode.window.showInputBox({
				prompt: "Enter a workspace-relative glob pattern",
				placeHolder: "src/**/*.ts",
				ignoreFocusOut: true,
				validateInput: (value) => value.trim() ? undefined : "Enter a glob pattern."
			});
			if (pattern === undefined) {
				return;
			}
			const workflow = await selectWorkflow(output);
			if (workflow) {
				await resolveAndPreview({ kind: "glob", pattern }, workflow, output);
			}
		}),
		vscode.commands.registerCommand(COMMANDS.onFolder, async (resource?: vscode.Uri) => {
			const folder = resource ?? (await vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: "Select Folder"
			}))?.[0];
			if (!folder) {
				return;
			}
			const workflow = await selectWorkflow(output);
			if (workflow) {
				await resolveAndPreview({ kind: "folder", folder }, workflow, output);
			}
		})
	);
}

export function deactivate(): void { }

async function selectWorkflow(output: vscode.OutputChannel): Promise<Workflow | undefined> {
	const rawWorkflows: unknown = vscode.workspace
		.getConfiguration("multiCommandRunner")
		.get<unknown>("workflows", {});
	const result = parseWorkflows(rawWorkflows);

	if (result.errors.length > 0) {
		for (const error of result.errors) {
			output.appendLine(`Configuration error: ${error}`);
		}
		void output.show(true);
		void vscode.window.showErrorMessage(
			"Some workflows are invalid. See the TechStack Multi Command Executor output for details."
		);
	}

	if (result.workflows.length === 0) {
		if (result.errors.length === 0) {
			void vscode.window.showInformationMessage(
				"Configure workflows in the multiCommandRunner.workflows setting first."
			);
		}
		return undefined;
	}

	const selected = await vscode.window.showQuickPick(
		result.workflows.map((workflow) => ({
			label: workflow.label ?? workflow.name,
			description: workflow.description,
			workflow
		})),
		{ placeHolder: "Select a command workflow" }
	);
	return selected?.workflow;
}

async function resolveAndPreview(
	scope: TargetScope,
	workflow: Workflow,
	output: vscode.OutputChannel
): Promise<void> {
	try {
		if (
			(scope.kind === "workspace" || scope.kind === "glob") &&
			(vscode.workspace.workspaceFolders?.length ?? 0) === 0
		) {
			void vscode.window.showErrorMessage(
				"Open a workspace folder before running a workspace or glob workflow."
			);
			return;
		}

		const excludedDirectories = vscode.workspace
			.getConfiguration("multiCommandRunner")
			.get<string[]>("excludedDirectories", []);
		const result = await resolveTargets(scope, workflow, { excludedDirectories });
		for (const error of result.errors) {
			output.appendLine(`Target resolution error: ${error}`);
		}
		if (result.errors.length > 0) {
			output.show(true);
			void vscode.window.showWarningMessage(
				`${result.errors.length} selected resource(s) could not be inspected. See the output for details.`
			);
		}
		output.appendLine(`Resolved ${result.targets.length} target(s) for workflow "${workflow.name}".`);
		for (const target of result.targets) {
			output.appendLine(target.fsPath);
		}
		if (await previewTargets(result.targets, workflow.label ?? workflow.name)) {
			const label = workflow.label ?? workflow.name;
			const report = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Running "${label}"`,
					cancellable: true
				},
				(progress, cancellationToken) => executeWorkflowOnTargets(
					result.targets,
					workflow,
					{
						output,
						cancellationToken,
						onFileStart: (fileIndex, totalFiles, uri) => {
							progress.report({
								message: `${fileIndex - 1}/${totalFiles}: Running ${vscode.workspace.asRelativePath(uri, false)}`
							});
						},
						onFileComplete: (completedFiles, totalFiles, fileResult) => {
							progress.report({
								increment: 100 / totalFiles,
								message: `${completedFiles}/${totalFiles}: Finished ${vscode.workspace.asRelativePath(fileResult.uri, false)}`
							});
						}
					}
				)
			);
			reportRun(report, label, output);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		output.appendLine(`Target resolution failed: ${message}`);
		output.show(true);
		void vscode.window.showErrorMessage(`Unable to resolve workflow targets: ${message}`);
	}
}

function reportRun(
	report: WorkflowExecutionReport,
	workflowLabel: string,
	output: vscode.OutputChannel
): void {
	const counts = {
		succeeded: 0,
		failed: 0,
		cancelled: 0,
		notStarted: 0
	};
	for (const file of report.files) {
		counts[file.status] += 1;
	}

	const summary =
		`${counts.succeeded} succeeded, ${counts.failed} failed, ` +
		`${counts.cancelled} cancelled, ${counts.notStarted} not started.`;
	output.appendLine(`Workflow "${workflowLabel}" finished: ${summary}`);
	if (report.editorRestoreError) {
		output.appendLine(`Editor restoration warning: ${report.editorRestoreError}`);
	}

	if (report.cancelled) {
		output.show(true);
		void vscode.window.showWarningMessage(
			`Workflow "${workflowLabel}" cancelled. ${summary} Any command already running had to finish before cancellation took effect.`
		);
	} else if (counts.failed > 0 || report.editorRestoreError) {
		output.show(true);
		void vscode.window.showWarningMessage(
			`Workflow "${workflowLabel}" completed with issues. ${summary} See the TechStack Multi Command Executor output for details.`
		);
	} else {
		void vscode.window.showInformationMessage(
			`Workflow "${workflowLabel}" completed. ${summary}`
		);
	}
}
