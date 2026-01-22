import ts from "typescript";
import path from "node:path";

export interface Options {
	/**
	 * Working directory (defaults to process.cwd())
	 */
	cwd?: string;
	/**
	 * Path to tsconfig.json (defaults to searching from cwd)
	 */
	configPath?: string;
}

export interface Result {
	success: boolean;
	errors: Diagnostic[];
}

export interface Diagnostic {
	file?: string;
	line?: number;
	character?: number;
	code: number;
	message: string;
}

/**
 * Typecheck specific TypeScript files using the project's tsconfig.json
 *
 * @param files - Array of file paths to typecheck
 * @param options - Optional configuration
 * @returns Result with success status and any errors found
 */
export function typecheckFiles(files: string[], options: Options = {}): Result {
	const cwd = options.cwd ?? process.cwd();
	const tsFiles = files.filter((arg) => arg.endsWith(".ts") || arg.endsWith(".tsx"));

	if (tsFiles.length === 0) {
		return { success: true, errors: [] };
	}

	// Find and load tsconfig.json
	const configPath =
		options.configPath ?? ts.findConfigFile(cwd, ts.sys.fileExists.bind(ts.sys), "tsconfig.json");

	if (!configPath) {
		return {
			success: false,
			errors: [{ message: "Could not find tsconfig.json", code: -1 }],
		};
	}

	const configContent = ts.sys.readFile(configPath);
	if (!configContent) {
		return {
			success: false,
			errors: [{ message: `Could not read ${configPath}`, code: -1 }],
		};
	}

	const configResult = ts.parseConfigFileTextToJson(configPath, configContent);
	if (configResult.error) {
		return {
			success: false,
			errors: [
				{
					message: ts.flattenDiagnosticMessageText(configResult.error.messageText, "\n"),
					code: configResult.error.code,
				},
			],
		};
	}

	// Parse compiler options
	const parsedCmd = ts.parseJsonConfigFileContent(configResult.config, ts.sys, cwd);

	// Filter to only the files we want to check
	const resolvedFiles = tsFiles.map((f) => path.resolve(cwd, f));

	// Create program with only our files
	const host = ts.createCompilerHost(parsedCmd.options);
	const program = ts.createProgram(resolvedFiles, parsedCmd.options, host);

	// Emit and check diagnostics
	const emitResult = program.emit();

	const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

	const errors: Diagnostic[] = [];

	for (const diagnostic of allDiagnostics) {
		if (diagnostic.category === ts.DiagnosticCategory.Error) {
			const error: Diagnostic = {
				code: diagnostic.code,
				message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
			};

			if (diagnostic.file) {
				error.file = diagnostic.file.fileName;
				const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
					diagnostic.start ?? 0,
				);
				error.line = line + 1;
				error.character = character + 1;
			}

			errors.push(error);
		}
	}

	return {
		success: errors.length === 0,
		errors,
	};
}
