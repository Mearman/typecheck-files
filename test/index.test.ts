import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { typecheckFiles } from "../src/index.ts";

function isExecException(error: unknown): error is { status: number; stderr?: string } {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof error.status === "number" &&
		("stderr" in error ? typeof error.stderr === "string" || error.stderr === undefined : true)
	);
}

void describe("typecheck-files", () => {
	void it("returns success when no files provided", () => {
		const result = typecheckFiles([]);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.errors.length, 0);
	});

	void it("filters out non-ts/tsx files", () => {
		const result = typecheckFiles(["src/index.ts", "README.md", "package.json"]);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.errors.length, 0);
	});

	void it("returns error when tsconfig.json not found", () => {
		const result = typecheckFiles(["src/index.ts"], { cwd: "/nonexistent" });
		assert.strictEqual(result.success, false);
		assert.strictEqual(result.errors.length, 1);
		assert.ok(result.errors[0].message.includes("Could not find tsconfig.json"));
		assert.strictEqual(result.errors[0].code, -1);
	});

	void it("typechecks valid files successfully", () => {
		const result = typecheckFiles(["src/index.ts"]);
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.errors.length, 0);
	});

	void it("returns errors for files with type errors", () => {
		// Create a temporary file in src with type errors
		const tempFile = "src/_test_invalid_.ts";
		fs.writeFileSync(
			tempFile,
			`
				const x: string = 42;
				export {};
			`,
		);

		const result = typecheckFiles([tempFile]);
		assert.strictEqual(result.success, false);
		assert.ok(result.errors.length > 0);

		// Clean up
		fs.rmSync(tempFile, { force: true });
	});

	void it("returns error with file info for type errors", () => {
		// Create a temporary file in src with type errors
		const tempFile = "src/_test_error_location_.ts";
		fs.writeFileSync(
			tempFile,
			`
				const x: string = 123;
				export {};
			`,
		);

		const result = typecheckFiles([tempFile]);

		// Should fail with type error
		assert.strictEqual(result.success, false, "expected typecheck to fail");
		assert.ok(result.errors.length > 0, "expected at least one error");

		const error = result.errors[0];
		assert.ok(error.file, "expected error to have file path");
		assert.ok(error.line, "expected error to have line number");
		assert.ok(error.character, "expected error to have character position");
		assert.strictEqual(typeof error.code, "number", "expected error code to be a number");

		// Clean up
		fs.rmSync(tempFile, { force: true });
	});

	void it("returns error when tsconfig.json has invalid JSON", () => {
		// Create an invalid tsconfig.json
		const invalidConfig = "tsconfig.invalid.json";
		fs.writeFileSync(invalidConfig, "{ invalid json }");

		const result = typecheckFiles(["src/index.ts"], { configPath: invalidConfig });
		assert.strictEqual(result.success, false);
		assert.ok(result.errors.length > 0);
		// TypeScript reports JSON parsing errors
		assert.ok(result.errors[0].message.length > 0);
		assert.strictEqual(typeof result.errors[0].code, "number");

		// Clean up
		fs.rmSync(invalidConfig, { force: true });
	});

	void it("returns error when tsconfig.json exists but is unreadable", () => {
		// Skip on Windows where chmod behaves differently
		if (process.platform === "win32") {
			return;
		}

		const unreadableConfig = "tsconfig.unreadable.json";
		fs.writeFileSync(unreadableConfig, "{}");
		// Remove all permissions (no read, write, or execute)
		fs.chmodSync(unreadableConfig, 0o000);

		try {
			const result = typecheckFiles(["src/index.ts"], { configPath: unreadableConfig });
			assert.strictEqual(result.success, false);
			assert.ok(result.errors[0].message.includes("Could not read"));
		} finally {
			// Restore permissions before cleanup
			fs.chmodSync(unreadableConfig, 0o644);
			fs.rmSync(unreadableConfig, { force: true });
		}
	});
});

void describe("CLI", () => {
	void it("exits with code 0 on success", () => {
		const result = execSync("npx tsx src/cli.ts src/index.ts", {
			encoding: "utf8",
			stdio: "pipe",
		});
		assert.strictEqual(result, "");
	});

	void it("exits with code 1 and outputs formatted errors on type errors", () => {
		const tempFile = "src/_cli_test_error_.ts";
		fs.writeFileSync(tempFile, "const x: string = 42;");

		try {
			execSync(`npx tsx src/cli.ts ${tempFile}`, {
				encoding: "utf8",
				stdio: "pipe",
			});
			assert.fail("Expected CLI to exit with code 1");
		} catch (error: unknown) {
			assert.ok(isExecException(error));
			assert.strictEqual(error.status, 1);
			assert.ok((error.stderr ?? "").includes("error TS"));
			assert.ok((error.stderr ?? "").includes("Type 'number' is not assignable to type 'string'"));
		} finally {
			fs.rmSync(tempFile, { force: true });
		}
	});

	void it("outputs generic error message when file info unavailable", () => {
		const invalidConfig = "tsconfig.cli-test.json";
		fs.writeFileSync(invalidConfig, "{ invalid }");

		try {
			execSync(`npx tsx src/cli.ts src/index.ts --config ${invalidConfig}`, {
				encoding: "utf8",
				stdio: "pipe",
			});
			assert.fail("Expected CLI to exit with code 1");
		} catch (error: unknown) {
			assert.ok(isExecException(error));
			assert.strictEqual(error.status, 1);
			assert.ok((error.stderr ?? "").includes("error:"));
		} finally {
			fs.rmSync(invalidConfig, { force: true });
		}
	});

	void it("supports -c short flag for config", () => {
		const result = execSync("npx tsx src/cli.ts src/index.ts -c tsconfig.json", {
			encoding: "utf8",
			stdio: "pipe",
		});
		assert.strictEqual(result, "");
	});
});
