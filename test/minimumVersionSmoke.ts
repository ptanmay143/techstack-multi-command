import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";
import type { Workflow } from "../src/workflows";

const extensionId = "local.techstack-multi-command";
const commandIds = [
	"multiCommandRunner.runWorkflowFromExplorer",
	"multiCommandRunner.runWorkflowOnWorkspace",
	"multiCommandRunner.runWorkflowOnGlob",
	"multiCommandRunner.runWorkflowOnFolder"
];

export async function run(): Promise<void> {
	const extension = vscode.extensions.getExtension(extensionId);
	assert.ok(extension, `Expected extension ${extensionId} to be loaded.`);
	await extension.activate();

	const registeredCommands = await vscode.commands.getCommands(true);
	for (const commandId of commandIds) {
		assert.ok(registeredCommands.includes(commandId), `Expected ${commandId} to be registered.`);
	}

	const extensionPath = process.env.TECHSTACK_MCR_EXTENSION_PATH;
	assert.ok(extensionPath, "Expected the smoke test to run against the extracted VSIX.");
	const { resolveTargets } = require(
		path.join(extensionPath, "out", "src", "targetResolver.js")
	) as typeof import("../src/targetResolver");
	const workspaceFolder = vscode.workspace.workspaceFolders?.find(
		(folder) => folder.name === "workspace-a"
	);
	assert.ok(workspaceFolder, "Expected the multi-root smoke-test workspace to be open.");
	const target = vscode.Uri.joinPath(workspaceFolder.uri, "src", "a.ts");
	const workflow: Workflow = {
		name: "minimum-engine-smoke",
		steps: [{ command: "editor.action.formatDocument" }],
		include: ["**/*.ts"],
		save: "never"
	};

	const resolution = await resolveTargets(
		{ kind: "selected", resources: [target] },
		workflow,
		{ excludedDirectories: [] }
	);
	assert.deepEqual(resolution.errors, []);
	assert.deepEqual(
		resolution.targets.map((uri: vscode.Uri) => uri.toString(true)),
		[target.toString(true)]
	);
}
