import * as vscode from "vscode";
import { Workflow } from "./workflows";

export type WorkflowFailureKind = "open" | "activate" | "command" | "save";

export interface WorkflowFailure {
	kind: WorkflowFailureKind;
	message: string;
	stepIndex?: number;
	command?: string;
}

export interface FileExecutionResult {
	uri: vscode.Uri;
	status: "succeeded" | "failed" | "cancelled" | "notStarted";
	completedSteps: number;
	failure?: WorkflowFailure;
}

export interface WorkflowExecutionOptions {
	output?: vscode.OutputChannel;
	cancellationToken?: vscode.CancellationToken;
	onFileStart?: (fileIndex: number, totalFiles: number, uri: vscode.Uri) => void;
	onFileComplete?: (
		completedFiles: number,
		totalFiles: number,
		result: FileExecutionResult
	) => void;
}

export interface WorkflowExecutionReport {
	files: FileExecutionResult[];
	cancelled: boolean;
	editorRestoreError?: string;
}

export async function executeWorkflowOnTargets(
	targets: readonly vscode.Uri[],
	workflow: Workflow,
	options: WorkflowExecutionOptions = {}
): Promise<WorkflowExecutionReport> {
	const previousDocument = vscode.window.activeTextEditor?.document;
	const results: FileExecutionResult[] = [];
	let editorRestoreError: string | undefined;
	let cancelled = false;

	try {
		for (let index = 0; index < targets.length; index += 1) {
			if (options.cancellationToken?.isCancellationRequested) {
				cancelled = true;
				results.push(...targets.slice(index).map((uri) => notStarted(uri)));
				break;
			}

			options.onFileStart?.(index + 1, targets.length, targets[index]);
			const result = await executeWorkflowForFile(
				targets[index],
				workflow,
				options.cancellationToken
			);
			results.push(result);
			logResult(result, options.output);
			options.onFileComplete?.(results.length, targets.length, result);

			if (result.status === "cancelled") {
				cancelled = true;
				results.push(...targets.slice(index + 1).map((uri) => notStarted(uri)));
				break;
			}
		}
	} finally {
		if (previousDocument) {
			try {
				await vscode.window.showTextDocument(previousDocument, {
					preview: false,
					preserveFocus: false
				});
			} catch (error) {
				editorRestoreError = errorMessage(error);
				options.output?.appendLine(`Could not restore the previously active editor: ${editorRestoreError}`);
			}
		}
	}

	return {
		files: results,
		cancelled,
		...(editorRestoreError === undefined ? {} : { editorRestoreError })
	};
}

async function executeWorkflowForFile(
	uri: vscode.Uri,
	workflow: Workflow,
	cancellationToken?: vscode.CancellationToken
): Promise<FileExecutionResult> {
	if (cancellationToken?.isCancellationRequested) {
		return cancelled(uri, 0);
	}

	let document: vscode.TextDocument;
	try {
		document = await vscode.workspace.openTextDocument(uri);
	} catch (error) {
		return failed(uri, 0, { kind: "open", message: errorMessage(error) });
	}

	if (cancellationToken?.isCancellationRequested) {
		return cancelled(uri, 0);
	}

	try {
		await showDocument(document);
	} catch (error) {
		return failed(uri, 0, { kind: "activate", message: errorMessage(error) });
	}

	let completedSteps = 0;
	for (let index = 0; index < workflow.steps.length; index += 1) {
		if (cancellationToken?.isCancellationRequested) {
			return cancelled(uri, completedSteps);
		}

		const step = workflow.steps[index];
		try {
			if (!isActiveDocument(document)) {
				await showDocument(document);
			}
			await vscode.commands.executeCommand(step.command, ...(step.args ?? []));
		} catch (error) {
			return failed(uri, completedSteps, {
				kind: "command",
				stepIndex: index,
				command: step.command,
				message: errorMessage(error)
			});
		}
		completedSteps += 1;

		if (workflow.save === "afterEachStep") {
			try {
				await saveDocument(document);
			} catch (error) {
				return failed(uri, completedSteps, {
					kind: "save",
					stepIndex: index,
					command: step.command,
					message: errorMessage(error)
				});
			}
		}
	}

	if (workflow.save === "afterWorkflow") {
		try {
			await saveDocument(document);
		} catch (error) {
			return failed(uri, completedSteps, {
				kind: "save",
				message: errorMessage(error)
			});
		}
	}

	return { uri, status: "succeeded", completedSteps };
}

async function showDocument(document: vscode.TextDocument): Promise<void> {
	await vscode.window.showTextDocument(document, {
		preview: false,
		preserveFocus: false
	});
}

function isActiveDocument(document: vscode.TextDocument): boolean {
	return vscode.window.activeTextEditor?.document.uri.toString(true) === document.uri.toString(true);
}

async function saveDocument(document: vscode.TextDocument): Promise<void> {
	if (!await document.save()) {
		throw new Error("VS Code reported that the document could not be saved.");
	}
}

function failed(
	uri: vscode.Uri,
	completedSteps: number,
	failure: WorkflowFailure
): FileExecutionResult {
	return { uri, status: "failed", completedSteps, failure };
}

function cancelled(uri: vscode.Uri, completedSteps: number): FileExecutionResult {
	return { uri, status: "cancelled", completedSteps };
}

function notStarted(uri: vscode.Uri): FileExecutionResult {
	return { uri, status: "notStarted", completedSteps: 0 };
}

function logResult(result: FileExecutionResult, output?: vscode.OutputChannel): void {
	if (result.status === "succeeded") {
		output?.appendLine(
			`Completed ${result.uri.fsPath} (${result.completedSteps} command step(s)).`
		);
		return;
	}

	if (result.status === "cancelled") {
		output?.appendLine(
			`Cancelled ${result.uri.fsPath} after ${result.completedSteps} command step(s).`
		);
		return;
	}

	if (result.status === "notStarted") {
		output?.appendLine(`Not started ${result.uri.fsPath} because the run was cancelled.`);
		return;
	}

	const failure = result.failure;
	const location = failure?.stepIndex === undefined
		? failure?.kind ?? "unknown"
		: `step ${failure.stepIndex + 1}${failure.command ? ` (${failure.command})` : ""}`;
	output?.appendLine(
		`Failed ${result.uri.fsPath} at ${location}: ${failure?.message ?? "Unknown error."}`
	);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
