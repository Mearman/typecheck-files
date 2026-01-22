#!/usr/bin/env node
import { typecheckFiles } from "./index.js";

// Parse args: support --config <path> and file paths
const args = process.argv.slice(2);
const files: string[] = [];
let configPath: string | undefined = undefined;

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (!arg) continue;
	if (arg === "--config" || arg === "-c") {
		const nextArg = args[++i];
		if (nextArg) configPath = nextArg;
	} else if (!arg.startsWith("-")) {
		files.push(arg);
	}
}

const options: { configPath?: string } = {};
if (configPath) options.configPath = configPath;

const result = typecheckFiles(files, options);

if (!result.success) {
	for (const error of result.errors) {
		if (error.file && error.line && error.character) {
			console.error(
				`${error.file}:${error.line}:${error.character}: error TS${error.code}: ${error.message}`,
			);
		} else {
			console.error(`error: ${error.message}`);
		}
	}
	process.exit(1);
}

process.exit(0);
