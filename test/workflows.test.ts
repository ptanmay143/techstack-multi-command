import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkflows } from "../src/workflows";

test("parses named workflows and defaults save policy to afterWorkflow", () => {
	const result = parseWorkflows({
		"Format and organize": {
			label: "Format and organize",
			steps: [
				{ command: "editor.action.formatDocument" },
				{ command: "editor.action.organizeImports", args: [{ source: "explicit" }] }
			],
			include: ["src/**/*.ts"],
			exclude: ["**/generated/**"]
		}
	});

	assert.deepEqual(result.errors, []);
	assert.equal(result.workflows.length, 1);
	assert.equal(result.workflows[0].save, "afterWorkflow");
	assert.equal(result.workflows[0].steps[1].command, "editor.action.organizeImports");
});

test("reports malformed workflows while retaining valid workflows", () => {
	const result = parseWorkflows({
		Good: { steps: [{ command: "editor.action.formatDocument" }] },
		Empty: { steps: [] },
		"Missing command": { steps: [{ command: "  " }] },
		"Bad save": { steps: [{ command: "example.command" }], save: "sometimes" },
		"Bad args": { steps: [{ command: "example.command", args: [undefined] }] }
	});

	assert.deepEqual(result.workflows.map((workflow) => workflow.name), ["Good"]);
	assert.equal(result.errors.length, 4);
	assert.match(result.errors.join("\n"), /Empty/);
	assert.match(result.errors.join("\n"), /Missing command/);
	assert.match(result.errors.join("\n"), /Bad save/);
	assert.match(result.errors.join("\n"), /Bad args/);
});

test("rejects a non-object workflows setting", () => {
	const result = parseWorkflows([]);

	assert.deepEqual(result.workflows, []);
	assert.deepEqual(result.errors, ["multiCommandRunner.workflows must be an object."]);
});
