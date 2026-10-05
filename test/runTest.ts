import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
	const extensionDevelopmentPath = path.resolve(
		process.env.TECHSTACK_MCR_EXTENSION_PATH ?? path.resolve(__dirname, "../..")
	);
	const extensionTestsPath = path.resolve(
		process.env.TECHSTACK_MCR_EXTENSION_TESTS_PATH ?? path.resolve(__dirname, "suite")
	);
	const workspacePath = path.resolve(__dirname, "../../test/fixtures/multi-root.code-workspace");
	const executablePath = process.env.VSCODE_EXECUTABLE;
	const profileDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "techstack-mcr-vscode-profile-"));
	const executionDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "techstack-mcr-execution-test-"));

	try {
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			...(process.env.VSCODE_VERSION === undefined ? {} : { version: process.env.VSCODE_VERSION }),
			...(process.env.TECHSTACK_MCR_VSCODE_TEST_CACHE === undefined
				? {}
				: { cachePath: process.env.TECHSTACK_MCR_VSCODE_TEST_CACHE }),
			...(executablePath === undefined ? {} : { executablePath }),
			extensionTestsEnv: {
				TECHSTACK_MCR_TEST_TEMP: executionDirectory,
				...(process.env.TECHSTACK_MCR_EXTENSION_PATH === undefined
					? {}
					: { TECHSTACK_MCR_EXTENSION_PATH: process.env.TECHSTACK_MCR_EXTENSION_PATH })
			},
			launchArgs: [
				"--disable-extensions",
				"--disable-gpu",
				`--user-data-dir=${path.join(profileDirectory, "user-data")}`,
				`--extensions-dir=${path.join(profileDirectory, "extensions")}`,
				workspacePath
			]
		});
	} finally {
		await fs.rm(executionDirectory, { recursive: true, force: true });
		await fs.rm(profileDirectory, { recursive: true, force: true });
	}
}

main().catch((error: unknown) => {
	console.error("Extension Development Host tests failed.", error);
	process.exitCode = 1;
});
