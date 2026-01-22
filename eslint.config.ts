import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default [
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	prettierRecommended, // disable ESLint rules that conflict with Prettier
	{
		files: ["**/*.{ts,js,json,md}"],
		plugins: {
			prettier: prettierPlugin,
		},
		rules: {
			"prettier/prettier": [
				"error",
				{
					useTabs: true,
					tabWidth: 2,
					singleQuote: false,
					trailingComma: "all",
					printWidth: 100,
				},
			],
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			globals: {
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["commitlint.config.ts", "eslint.config.ts", "test/index.test.ts"],
					tsconfigRootDir: import.meta.dirname,
				},
			},
		},
		rules: {
			indent: ["error", "tab"],
			quotes: ["error", "double", { avoidEscape: true }],
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
		},
	},
];
