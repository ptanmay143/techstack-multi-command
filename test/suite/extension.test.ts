import * as assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import { resolveTargets } from "../../src/targetResolver";
import { executeWorkflowOnTargets } from "../../src/workflowExecutor";
import { Workflow } from "../../src/workflows";

const extensionId = "local.techstack-multi-command";
const contributedCommandIds = [
	"multiCommandRunner.runWorkflowFromExplorer",
	"multiCommandRunner.runWorkflowOnWorkspace",
	"multiCommandRunner.runWorkflowOnGlob",
	"multiCommandRunner.runWorkflowOnFolder"
];

let rootA: vscode.Uri;
let rootB: vscode.Uri;
let executionDirectory: string;

suite("TechStack Multi Command Executor extension", () => {
	suiteSetup(async () => {
		const folders = vscode.workspace.workspaceFolders ?? [];
		const first = folders.find((folder) => folder.name === "workspace-a");
		const second = folders.find((folder) => folder.name === "workspace-b");
		assert.ok(first, "Expected the first test workspace folder to be open.");
		assert.ok(second, "Expected the second test workspace folder to be open.");
		rootA = first.uri;
		rootB = second.uri;
		executionDirectory = process.env.TECHSTACK_MCR_TEST_TEMP ?? "";
		assert.ok(executionDirectory, "Expected the test runner to provide a temporary execution directory.");
		await fs.access(executionDirectory);
	});

	suiteTeardown(async () => {
		for (const document of vscode.workspace.textDocuments) {
			if (document.uri.fsPath.startsWith(executionDirectory) && document.isDirty) {
				await document.save();
			}
		}
	});

	test("activates and registers contributed commands", async () => {
		const extension = vscode.extensions.getExtension(extensionId);
		assert.ok(extension, `Expected extension ${extensionId} to be available.`);
		await extension.activate();

		const registeredCommands = await vscode.commands.getCommands(true);
		for (const commandId of contributedCommandIds) {
			assert.ok(registeredCommands.includes(commandId), `Expected ${commandId} to be registered.`);
		}
	});

	test("contributes the Explorer workflow submenu", () => {
		const extension = vscode.extensions.getExtension(extensionId);
		assert.ok(extension);

		const manifest = extension.packageJSON;
		assert.equal(manifest.name, "techstack-multi-command");
		assert.equal(manifest.displayName, "TechStack Multi Command Executor");
		assert.ok(
			manifest.contributes.submenus.some(
				(submenu: { id: string }) => submenu.id === "multiCommandRunner.workflowMenu"
			)
		);
		assert.ok(
			manifest.contributes.menus["explorer/context"].some(
				(item: { submenu?: string }) => item.submenu === "multiCommandRunner.workflowMenu"
			)
		);
	});

	test("resolves filtered workspace targets across workspace roots", async () => {
		const result = await resolveTargets(
			{ kind: "workspace" },
			workflow({ include: ["src/**/*.ts"], exclude: ["**/skip.ts"] }),
			{ excludedDirectories: ["node_modules"] }
		);

		assert.deepEqual(result.errors, []);
		assert.deepEqual(
			result.targets.map((uri) => path.relative(rootA.fsPath, uri.fsPath).replace(/\\/g, "/")),
			["src/a.ts", path.relative(rootA.fsPath, path.join(rootB.fsPath, "src/b.ts")).replace(/\\/g, "/")]
		);
	});

	test("always excludes .git and configured directories from workspace targets", async () => {
		const result = await resolveTargets(
			{ kind: "workspace" },
			workflow(),
			{ excludedDirectories: ["node_modules", ".vscode", "dist", "out", ".venv"] }
		);

		assert.deepEqual(
			result.targets.map((uri) => path.relative(rootA.fsPath, uri.fsPath).replace(/\\/g, "/")),
			[
				"src/a.ts",
				"src/readme.md",
				"src/skip.ts",
				path.relative(rootA.fsPath, path.join(rootB.fsPath, "src/b.ts")).replace(/\\/g, "/")
			]
		);
	});

	test("resolves glob scopes and selected file/folder resources without duplicates", async () => {
		const globResult = await resolveTargets(
			{ kind: "glob", pattern: "src/**/*.ts" },
			workflow({ exclude: ["**/skip.ts"] }),
			{ excludedDirectories: ["node_modules"] }
		);
		const selectionResult = await resolveTargets(
			{
				kind: "selected",
				resources: [
					vscode.Uri.joinPath(rootA, "src", "a.ts"),
					vscode.Uri.joinPath(rootA, "src"),
					vscode.Uri.joinPath(rootA, "src", "a.ts")
				]
			},
			workflow({ include: ["src/**/*.ts"], exclude: ["**/skip.ts"] })
		);
		const folderResult = await resolveTargets(
			{ kind: "folder", folder: vscode.Uri.joinPath(rootA, "src") },
			workflow({ include: ["src/**/*.ts"], exclude: ["**/skip.ts"] })
		);

		assert.deepEqual(globResult.targets.map((uri) => path.basename(uri.fsPath)), ["a.ts", "b.ts"]);
		assert.deepEqual(selectionResult.targets.map((uri) => path.basename(uri.fsPath)), ["a.ts"]);
		assert.deepEqual(folderResult.targets.map((uri) => path.basename(uri.fsPath)), ["a.ts"]);
	});

	test("honors workspace files.exclude for directly selected files", async () => {
		const result = await resolveTargets(
			{ kind: "selected", resources: [vscode.Uri.joinPath(rootA, "filtered", "hidden.ts")] },
			workflow()
		);
		assert.deepEqual(result.targets, []);
	});

	test("reports inaccessible selected resources instead of silently dropping them", async () => {
		const result = await resolveTargets(
			{ kind: "selected", resources: [vscode.Uri.joinPath(rootA, "missing.ts")] },
			workflow()
		);

		assert.deepEqual(result.targets, []);
		assert.equal(result.errors.length, 1);
		assert.match(result.errors[0], /missing\.ts/);
	});

	test("runs workflow commands in order, passes arguments, saves, and restores the active editor", async () => {
		const target = await createExecutionFile("sequence.txt", "start");
		const previouslyActive = await createExecutionFile("previous.txt", "previous");
		const targetDocument = await vscode.workspace.openTextDocument(target);
		const previousDocument = await vscode.workspace.openTextDocument(previouslyActive);
		await vscode.window.showTextDocument(previousDocument);

		const invocations: string[] = [];
		const startedFiles: number[] = [];
		const completedFiles: number[] = [];
		const append = vscode.commands.registerCommand("techstackMcrTest.append", async (suffix: string) => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			invocations.push(suffix);
			const end = editor.document.positionAt(editor.document.getText().length);
			assert.ok(await editor.edit((edit) => edit.insert(end, suffix)));
		});

		try {
			const result = await executeWorkflowOnTargets([target], workflow({
				steps: [
					{ command: "techstackMcrTest.append", args: ["1"] },
					{ command: "techstackMcrTest.append", args: ["2"] }
				]
			}), {
				onFileStart: (index) => startedFiles.push(index),
				onFileComplete: (completed) => completedFiles.push(completed)
			});

			assert.equal(result.files[0].status, "succeeded");
			assert.equal(result.files[0].completedSteps, 2);
			assert.equal(result.cancelled, false);
			assert.deepEqual(invocations, ["1", "2"]);
			assert.deepEqual(startedFiles, [1]);
			assert.deepEqual(completedFiles, [1]);
			assert.equal(await fs.readFile(target.fsPath, "utf8"), "start12");
			assert.equal(
				vscode.window.activeTextEditor?.document.uri.toString(true),
				previousDocument.uri.toString(true)
			);
			assert.ok(vscode.workspace.textDocuments.includes(targetDocument));
		} finally {
			append.dispose();
		}
	});

	test("cancellation before execution marks every target not started", async () => {
		const first = await createExecutionFile("cancel-before-first.txt", "first");
		const second = await createExecutionFile("cancel-before-second.txt", "second");
		const cancellation = new vscode.CancellationTokenSource();
		cancellation.cancel();
		const completedFiles: number[] = [];

		try {
			const result = await executeWorkflowOnTargets(
				[first, second],
				workflow(),
				{
					cancellationToken: cancellation.token,
					onFileComplete: (completed) => completedFiles.push(completed)
				}
			);

			assert.equal(result.cancelled, true);
			assert.deepEqual(result.files.map((file) => file.status), ["notStarted", "notStarted"]);
			assert.deepEqual(completedFiles, []);
		} finally {
			cancellation.dispose();
		}
	});

	test("mid-run cancellation waits for the active command and prevents later steps and files", async () => {
		const first = await createExecutionFile("cancel-mid-first.txt", "first");
		const second = await createExecutionFile("cancel-mid-second.txt", "second");
		let signalCommandStarted!: () => void;
		let finishCommand!: () => void;
		const commandStarted = new Promise<void>((resolve) => {
			signalCommandStarted = resolve;
		});
		const commandGate = new Promise<void>((resolve) => {
			finishCommand = resolve;
		});
		const invocations: string[] = [];
		const completedFiles: number[] = [];
		const slow = vscode.commands.registerCommand("techstackMcrTest.slow", async () => {
			invocations.push("slow");
			signalCommandStarted();
			await commandGate;
		});
		const later = vscode.commands.registerCommand("techstackMcrTest.later", () => {
			invocations.push("later");
		});
		const cancellation = new vscode.CancellationTokenSource();

		try {
			const run = executeWorkflowOnTargets(
				[first, second],
				workflow({
					steps: [
						{ command: "techstackMcrTest.slow" },
						{ command: "techstackMcrTest.later" }
					],
					save: "never"
				}),
				{
					cancellationToken: cancellation.token,
					onFileComplete: (completed) => completedFiles.push(completed)
				}
			);

			await commandStarted;
			cancellation.cancel();
			finishCommand();
			const result = await run;

			assert.equal(result.cancelled, true);
			assert.deepEqual(result.files.map((file) => file.status), ["cancelled", "notStarted"]);
			assert.equal(result.files[0].completedSteps, 1);
			assert.deepEqual(invocations, ["slow"]);
			assert.deepEqual(completedFiles, [1]);
		} finally {
			cancellation.dispose();
			slow.dispose();
			later.dispose();
			finishCommand();
		}
	});

	test("stops a failed file, continues to the next file, and leaves afterWorkflow edits unsaved", async () => {
		const first = await createExecutionFile("failure-first.txt", "first");
		const second = await createExecutionFile("failure-second.txt", "second");
		const invocations: string[] = [];
		const append = vscode.commands.registerCommand("techstackMcrTest.append", async (suffix: string) => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			invocations.push(`append:${path.basename(editor.document.uri.fsPath)}`);
			const end = editor.document.positionAt(editor.document.getText().length);
			assert.ok(await editor.edit((edit) => edit.insert(end, suffix)));
		});
		const failFirst = vscode.commands.registerCommand("techstackMcrTest.failFirst", () => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			invocations.push(`fail:${path.basename(editor.document.uri.fsPath)}`);
			if (editor.document.uri.fsPath === first.fsPath) {
				throw new Error("expected test failure");
			}
		});
		const finish = vscode.commands.registerCommand("techstackMcrTest.finish", () => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			invocations.push(`finish:${path.basename(editor.document.uri.fsPath)}`);
		});

		try {
			const results = await executeWorkflowOnTargets([first, second], workflow({
				steps: [
					{ command: "techstackMcrTest.append", args: ["-partial"] },
					{ command: "techstackMcrTest.failFirst" },
					{ command: "techstackMcrTest.finish" }
				]
			}));

			assert.deepEqual(results.files.map((result) => result.status), ["failed", "succeeded"]);
			assert.equal(results.files[0].failure?.kind, "command");
			assert.equal(results.files[0].failure?.stepIndex, 1);
			assert.equal(results.files[0].failure?.command, "techstackMcrTest.failFirst");
			assert.deepEqual(invocations, [
				"append:failure-first.txt",
				"fail:failure-first.txt",
				"append:failure-second.txt",
				"fail:failure-second.txt",
				"finish:failure-second.txt"
			]);
			assert.equal(await fs.readFile(first.fsPath, "utf8"), "first");
			assert.equal(await fs.readFile(second.fsPath, "utf8"), "second-partial");
			assert.ok(vscode.workspace.textDocuments.find((document) => document.uri.toString(true) === first.toString(true))?.isDirty);
		} finally {
			append.dispose();
			failFirst.dispose();
			finish.dispose();
		}
	});

	test("afterEachStep persists completed commands but never does not save", async () => {
		const partial = await createExecutionFile("after-each.txt", "each");
		const never = await createExecutionFile("never.txt", "never");
		const append = vscode.commands.registerCommand("techstackMcrTest.append", async (suffix: string) => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			const end = editor.document.positionAt(editor.document.getText().length);
			assert.ok(await editor.edit((edit) => edit.insert(end, suffix)));
		});
		const fail = vscode.commands.registerCommand("techstackMcrTest.fail", async () => {
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor);
			const end = editor.document.positionAt(editor.document.getText().length);
			assert.ok(await editor.edit((edit) => edit.insert(end, "2")));
			throw new Error("expected test failure");
		});

		try {
			const partialResult = await executeWorkflowOnTargets([partial], workflow({
				steps: [
					{ command: "techstackMcrTest.append", args: ["1"] },
					{ command: "techstackMcrTest.fail" }
				],
				save: "afterEachStep"
			}));
			const neverResult = await executeWorkflowOnTargets([never], workflow({
				steps: [{ command: "techstackMcrTest.append", args: ["-changed"] }],
				save: "never"
			}));

			assert.equal(partialResult.files[0].status, "failed");
			assert.equal(await fs.readFile(partial.fsPath, "utf8"), "each1");
			assert.equal(neverResult.files[0].status, "succeeded");
			assert.equal(await fs.readFile(never.fsPath, "utf8"), "never");
			assert.ok(vscode.workspace.textDocuments.find((document) => document.uri.toString(true) === never.toString(true))?.isDirty);
		} finally {
			append.dispose();
			fail.dispose();
		}
	});
});

function workflow(overrides: Partial<Workflow> = {}): Workflow {
	return {
		name: "test",
		steps: [{ command: "test.command" }],
		save: "afterWorkflow",
		...overrides
	};
}

async function createExecutionFile(name: string, content: string): Promise<vscode.Uri> {
	const uri = vscode.Uri.file(path.join(executionDirectory, name));
	await fs.writeFile(uri.fsPath, content);
	return uri;
}
