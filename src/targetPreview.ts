import * as vscode from "vscode";

const PREVIEW_LIMIT = 500;

export async function previewTargets(
	targets: readonly vscode.Uri[],
	workflowLabel: string
): Promise<boolean> {
	if (targets.length === 0) {
		void vscode.window.showInformationMessage("No files matched the workflow and target filters.");
		return false;
	}

	const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
	const previewCount = Math.min(targets.length, PREVIEW_LIMIT);
	quickPick.items = targets.slice(0, previewCount).map((target) => ({
		label: vscode.workspace.asRelativePath(target, false),
		description: target.fsPath
	}));
	quickPick.title = `Preview: ${workflowLabel}`;
	quickPick.placeholder = targets.length > PREVIEW_LIMIT
		? `${targets.length} files; showing the first ${PREVIEW_LIMIT}. Press Enter to confirm.`
		: `${targets.length} file(s). Press Enter to continue to confirmation.`;
	quickPick.matchOnDescription = true;
	quickPick.ignoreFocusOut = true;

	return new Promise<boolean>((resolve, reject) => {
		let settled = false;
		let accepting = false;
		const finish = (confirmed: boolean): void => {
			if (!settled) {
				settled = true;
				quickPick.dispose();
				resolve(confirmed);
			}
		};

		quickPick.onDidAccept(() => {
			accepting = true;
			quickPick.hide();
			void vscode.window.showWarningMessage(
				`Run "${workflowLabel}" on ${targets.length} file(s)? Command effects cannot be rolled back automatically.`,
				{ modal: true },
				"Run Workflow"
			).then(
				(choice) => finish(choice === "Run Workflow"),
				(error: unknown) => {
					quickPick.dispose();
					reject(error);
				}
			);
		});
		quickPick.onDidHide(() => {
			if (!accepting) {
				finish(false);
			}
		});
		quickPick.show();
	});
}
