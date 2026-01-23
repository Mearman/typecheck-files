# typecheck-files

[![npm version](https://img.shields.io/npm/v/typecheck-files.svg?logo=npm&labelColor=CB3837&logoColor=FFFFFF)](https://www.npmjs.com/package/typecheck-files) [![GitHub](https://img.shields.io/badge/github-Mearman%2Ftypecheck_files-24292e.svg?logo=github&labelColor=24292e&logoColor=FFFFFF)](https://github.com/Mearman/typecheck-files)

Typecheck specific TypeScript files using your project's `tsconfig.json`.

## Why

I wanted to type-check **only the staged files** with [lint-staged](https://github.com/okonet/lint-staged).

Unfortunately passing specific files like `tsc --noEmit file1.ts file2.ts` will cause TypeScript to simply ignore your `tsconfig.json`.

This tool uses TypeScript's public API to typecheck specific files while preserving all compiler options from your tsconfig.

## Installation

```bash
npm install -D typecheck-files
```

```bash
yarn add -D typecheck-files
```

```bash
pnpm add -D typecheck-files
```

## Usage

### With lint-staged

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "typecheck-files"
    ]
  }
}
```

### CLI

```bash
typecheck-files src/index.ts src/utils.ts
```

### Programmatic API

```ts
import { typecheckFiles } from "typecheck-files"

const result = typecheckFiles(["src/index.ts", "src/utils.ts"])

if (!result.success) {
  console.error("Type errors found:")
  for (const error of result.errors) {
    console.error(`  ${error.file}:${error.line}:${error.character}: ${error.message}`)
  }
  process.exit(1)
}
```

## How it works

1. Loads your project's `tsconfig.json`
2. Parses compiler options
3. Creates a TypeScript Program with only the specified files
4. Reports errors from those files

Unlike `tsc file.ts`, this preserves all your compiler options (paths, strict mode, etc.).

## Limitations

- Only typechecks the specified files
- Files that import from the specified files are **not** typechecked
- This is a tradeoff for speed—you get fast commits, but type errors in dependent files may be deferred

For full coverage, run a complete typecheck in CI:
```bash
tsc --noEmit
```

## Related Packages

**[tsc-files](https://github.com/gustavopch/tsc-files)** solves the same problem using a different approach: it generates a temporary tsconfig and spawns a separate `tsc` process. This package uses TypeScript's Program API directly, avoiding subprocess overhead and temporary files.

If you're looking for similar tools for other parts of your workflow, check out **[test-related](https://www.npmjs.com/package/test-related)** for running only tests related to changed files.
