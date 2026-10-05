import { minimatch } from "minimatch";
import * as path from "node:path";
import * as vscode from "vscode";
import { Workflow } from "./workflows";

export type TargetScope =
	| { kind: "selected"; resources: readonly vscode.Uri[] }
	| { kind: "workspace" }
	| { kind: "glob"; pattern: string }
	| { kind: "folder"; folder: vscode.Uri };

export interface TargetResolution {
	targets: vscode.Uri[];
	errors: string[];
}

export interface TargetResolutionOptions {
	excludedDirectories?: readonly string[];
}

interface RootedTarget {
	uri: vscode.Uri;
	root: vscode.Uri;
}

interface TargetRequest {
	base: vscode.Uri;
	include: string;
	root: vscode.Uri;
}

const ALWAYS_EXCLUDED_DIRECTORIES = new Set([".git"]);
const EMPTY_EXCLUSIONS: readonly string[] = [];

export async function resolveTargets(
	scope: TargetScope,
	workflow: Workflow,
	options: TargetResolutionOptions = {}
): Promise<TargetResolution> {
	const errors: string[] = [];
	const initialTargets = await discoverTargets(scope, errors);
	const uniqueTargets = deduplicate(initialTargets);
	const excludedDirectories = new Set([
		...ALWAYS_EXCLUDED_DIRECTORIES,
		...(options.excludedDirectories ?? []).map(normalizeDirectoryName)
	]);

	const targets = uniqueTargets
		.filter(({ uri, root }) => matchesPatterns(uri, root, workflow.include, true))
		.filter(({ uri, root }) => !matchesPatterns(uri, root, workflow.exclude, false))
		.filter(({ uri, root }) => !isFilesExcluded(uri, root))
		.filter(({ uri, root }) => !hasExcludedDirectory(uri, root, excludedDirectories))
		.map(({ uri }) => uri)
		.sort((left, right) => uriKey(left).localeCompare(uriKey(right)));

	return { targets, errors };
}

async function discoverTargets(scope: TargetScope, errors: string[]): Promise<RootedTarget[]> {
	switch (scope.kind) {
		case "selected":
			return discoverSelected(scope.resources, errors);
		case "workspace": {
			const folders = vscode.workspace.workspaceFolders ?? [];
			if (folders.length === 0) {
				throw new Error("Open a workspace folder before running a workspace workflow.");
			}
			return discoverRequests(folders.map((folder) => ({
				base: folder.uri,
				root: folder.uri,
				include: "**/*"
			})));
		}
		case "glob": {
			const folders = vscode.workspace.workspaceFolders ?? [];
			if (folders.length === 0) {
				throw new Error("Open a workspace folder before running a glob workflow.");
			}
			if (!scope.pattern.trim()) {
				throw new Error("Enter a non-empty glob pattern.");
			}
			return discoverRequests(folders.map((folder) => ({
				base: folder.uri,
				root: folder.uri,
				include: scope.pattern
			})));
		}
		case "folder": {
			const stat = await vscode.workspace.fs.stat(scope.folder);
			if ((stat.type & vscode.FileType.Directory) === 0) {
				throw new Error(`The selected resource is not a folder: ${scope.folder.fsPath}`);
			}
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(scope.folder);
			if (!workspaceFolder) {
				return discoverUnopenedFolder(scope.folder, scope.folder, errors);
			}
			return discoverRequests([{
				base: scope.folder,
				root: workspaceFolder.uri,
				include: "**/*"
			}]);
		}
	}
}

async function discoverSelected(
	resources: readonly vscode.Uri[],
	errors: string[]
): Promise<RootedTarget[]> {
	const candidates: RootedTarget[] = [];
	for (const resource of resources) {
		try {
			const stat = await vscode.workspace.fs.stat(resource);
			if ((stat.type & vscode.FileType.Directory) !== 0) {
				const workspaceFolder = vscode.workspace.getWorkspaceFolder(resource);
				if (!workspaceFolder) {
					candidates.push(...await discoverUnopenedFolder(resource, resource, errors));
					continue;
				}
				candidates.push(...await discoverRequests([{
					base: resource,
					root: workspaceFolder.uri,
					include: "**/*"
				}]));
			} else if ((stat.type & vscode.FileType.File) !== 0) {
				candidates.push({ uri: resource, root: getRoot(resource) });
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push(`${resource.fsPath}: ${message}`);
		}
	}
	return candidates;
}

async function discoverUnopenedFolder(
	folder: vscode.Uri,
	root: vscode.Uri,
	errors: string[]
): Promise<RootedTarget[]> {
	const candidates: RootedTarget[] = [];
	try {
		for (const [name, type] of await vscode.workspace.fs.readDirectory(folder)) {
			const child = vscode.Uri.joinPath(folder, name);
			if ((type & vscode.FileType.Directory) !== 0 && (type & vscode.FileType.SymbolicLink) === 0) {
				candidates.push(...await discoverUnopenedFolder(child, root, errors));
			} else if ((type & vscode.FileType.File) !== 0) {
				candidates.push({ uri: child, root });
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		errors.push(`${folder.fsPath}: ${message}`);
	}
	return candidates;
}

async function discoverRequests(requests: readonly TargetRequest[]): Promise<RootedTarget[]> {
	const candidates: RootedTarget[] = [];
	for (const request of requests) {
		const files = await vscode.workspace.findFiles(
			new vscode.RelativePattern(request.base, request.include),
			undefined
		);
		candidates.push(...files.map((uri) => ({ uri, root: request.root })));
	}
	return candidates;
}

function matchesPatterns(
	uri: vscode.Uri,
	root: vscode.Uri,
	patterns: readonly string[] | undefined,
	defaultWhenEmpty: boolean
): boolean {
	if (patterns === undefined || patterns.length === 0) {
		return defaultWhenEmpty;
	}
	const relativePath = getRelativePath(root, uri);
	return patterns.some((pattern) => minimatch(relativePath, pattern, {
		dot: true,
		nocase: process.platform === "win32"
	}));
}

function deduplicate(targets: readonly RootedTarget[]): RootedTarget[] {
	const unique = new Map<string, RootedTarget>();
	for (const target of targets) {
		const key = uriKey(target.uri);
		const existing = unique.get(key);
		if (!existing || isBetterRoot(target.root, existing.root)) {
			unique.set(key, target);
		}
	}
	return [...unique.values()];
}

function getRoot(uri: vscode.Uri): vscode.Uri {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
	if (workspaceFolder) {
		return workspaceFolder.uri;
	}
	return uri.with({ path: path.posix.dirname(uri.path) });
}

function isFilesExcluded(uri: vscode.Uri, root: vscode.Uri): boolean {
	const excludePatterns = vscode.workspace
		.getConfiguration("files", uri)
		.get<Record<string, unknown>>("exclude", {});
	const relativePath = getRelativePath(root, uri);
	return Object.entries(excludePatterns).some(([pattern, setting]) =>
		setting === true && minimatch(relativePath, pattern, {
			dot: true,
			nocase: process.platform === "win32"
		})
	);
}

function hasExcludedDirectory(
	uri: vscode.Uri,
	root: vscode.Uri,
	excludedDirectories: ReadonlySet<string>
): boolean {
	const relativePath = getRelativePath(root, uri);
	if (relativePath === ".." || relativePath.startsWith("../") || path.posix.isAbsolute(relativePath)) {
		return false;
	}
	return relativePath
		.split("/")
		.some((segment) => excludedDirectories.has(normalizeDirectoryName(segment)));
}

function normalizeDirectoryName(value: string): string {
	return value.trim().replace(/^[\\/]+|[\\/]+$/g, "").toLowerCase();
}

function getRelativePath(root: vscode.Uri, uri: vscode.Uri): string {
	if (root.scheme === "file" && uri.scheme === "file") {
		return path.relative(root.fsPath, uri.fsPath).replace(/\\/g, "/");
	}
	return path.posix.relative(root.path, uri.path);
}

function uriKey(uri: vscode.Uri): string {
	return uri.scheme === "file" ? path.resolve(uri.fsPath).toLowerCase() : uri.toString(true);
}

function isBetterRoot(candidate: vscode.Uri, current: vscode.Uri): boolean {
	return candidate.fsPath.length < current.fsPath.length;
}
