import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface ReleaseRule {
	type: string;
}

interface PluginConfig {
	releaseRules?: ReleaseRule[];
}

interface Releaserc {
	scopes?: string[];
	plugins?: [string, PluginConfig][];
}

// Type guard for string array
function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Read types and scopes from .releaserc.json for consistency
const releasercPath = resolve(import.meta.dirname, ".releaserc.json");
const releaserc = JSON.parse(readFileSync(releasercPath, "utf-8")) as Releaserc;

// Extract types from releaseRules
const pluginConfig = releaserc.plugins?.[0]?.[1];
const releaseRules = pluginConfig?.releaseRules ?? [];
const types = releaseRules.map((rule) => rule.type);

// Get scopes (empty array means no restriction)
const scopes = isStringArray(releaserc.scopes) ? releaserc.scopes : [];

const config = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [2, "always", types],
		"scope-enum": [2, "always", scopes.length > 0 ? scopes : []],
		"subject-case": [0],
	},
};

export default config;
