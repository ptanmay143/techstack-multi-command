export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export type SavePolicy = "afterEachStep" | "afterWorkflow" | "never";

export interface CommandStep {
	command: string;
	args?: JsonValue[];
}

export interface Workflow {
	name: string;
	label?: string;
	description?: string;
	steps: CommandStep[];
	include?: string[];
	exclude?: string[];
	save: SavePolicy;
}

export interface WorkflowParseResult {
	workflows: Workflow[];
	errors: string[];
}

export function parseWorkflows(value: unknown): WorkflowParseResult {
	if (!isRecord(value)) {
		return {
			workflows: [],
			errors: ["multiCommandRunner.workflows must be an object."]
		};
	}

	const workflows: Workflow[] = [];
	const errors: string[] = [];

	for (const [name, candidate] of Object.entries(value)) {
		const workflowErrors: string[] = [];
		if (!name.trim()) {
			workflowErrors.push("Workflow names must not be empty.");
		}
		if (!isRecord(candidate)) {
			errors.push(`Workflow "${name}" must be an object.`);
			continue;
		}

		const label = readOptionalText(candidate, "label", name, workflowErrors);
		const description = readOptionalText(candidate, "description", name, workflowErrors);
		const steps = readSteps(candidate.steps, name, workflowErrors);
		const include = readOptionalPatterns(candidate.include, "include", name, workflowErrors);
		const exclude = readOptionalPatterns(candidate.exclude, "exclude", name, workflowErrors);
		const save = readSavePolicy(candidate.save, name, workflowErrors);

		if (workflowErrors.length > 0) {
			errors.push(...workflowErrors);
			continue;
		}

		workflows.push({
			name,
			...(label === undefined ? {} : { label }),
			...(description === undefined ? {} : { description }),
			steps,
			...(include === undefined ? {} : { include }),
			...(exclude === undefined ? {} : { exclude }),
			save
		});
	}

	return { workflows, errors };
}

function readOptionalText(
	value: Record<string, unknown>,
	key: "label" | "description",
	workflowName: string,
	errors: string[]
): string | undefined {
	const field = value[key];
	if (field === undefined) {
		return undefined;
	}
	if (typeof field !== "string" || !field.trim()) {
		errors.push(`Workflow "${workflowName}" has an invalid "${key}"; use a non-empty string.`);
		return undefined;
	}
	return field;
}

function readSteps(value: unknown, workflowName: string, errors: string[]): CommandStep[] {
	if (!Array.isArray(value) || value.length === 0) {
		errors.push(`Workflow "${workflowName}" must define at least one command step.`);
		return [];
	}

	const steps: CommandStep[] = [];
	value.forEach((candidate, index) => {
		if (!isRecord(candidate) || typeof candidate.command !== "string" || !candidate.command.trim()) {
			errors.push(`Workflow "${workflowName}" step ${index + 1} must have a non-empty command identifier.`);
			return;
		}
		if (candidate.args !== undefined) {
			if (!Array.isArray(candidate.args) || !candidate.args.every(isJsonValue)) {
				errors.push(`Workflow "${workflowName}" step ${index + 1} args must be an array of JSON values.`);
				return;
			}
			steps.push({ command: candidate.command, args: candidate.args });
			return;
		}
		steps.push({ command: candidate.command });
	});

	return steps;
}

function readOptionalPatterns(
	value: unknown,
	key: "include" | "exclude",
	workflowName: string,
	errors: string[]
): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!Array.isArray(value) || !value.every((pattern) => typeof pattern === "string" && pattern.trim())) {
		errors.push(`Workflow "${workflowName}" "${key}" must be an array of non-empty glob strings.`);
		return undefined;
	}
	return value;
}

function readSavePolicy(value: unknown, workflowName: string, errors: string[]): SavePolicy {
	if (value === undefined) {
		return "afterWorkflow";
	}
	if (isSavePolicy(value)) {
		return value;
	}
	errors.push(`Workflow "${workflowName}" has an unsupported save policy; use afterEachStep, afterWorkflow, or never.`);
	return "afterWorkflow";
}

function isSavePolicy(value: unknown): value is SavePolicy {
	return value === "afterEachStep" || value === "afterWorkflow" || value === "never";
}

function isJsonValue(value: unknown): value is JsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") {
		return true;
	}
	if (typeof value === "number") {
		return Number.isFinite(value);
	}
	if (Array.isArray(value)) {
		return value.every(isJsonValue);
	}
	if (isRecord(value)) {
		return Object.values(value).every(isJsonValue);
	}
	return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
