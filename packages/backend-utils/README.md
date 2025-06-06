# @sirena/backend-utils

**Backend utils package** of the Sirena project.
The goal of this package is to export functionality for use in other packages.
Compiled using [`tsc`](https://github.com/microsoft/TypeScript).

## 📦 Project structure

```plaintext
src/
├── index.ts            → Lib entry.
├── helpers/            → Internal helpers, error utils.
├── schemas/            → Shared schemas (e.g., error format).
└── index.ts            → Main entry point (server bootstrap).
```

## 🚀 Scripts

| Command                | Description                                                                                              |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `pnpm build`           | Compile TypeScript files to JavaScript (runs `tsc`).                                                     |
| `pnpm dev`             | Run TypeScript in watch mode with output preserved (`tsc --watch --preserveWatchOutput`).                |
| `pnpm lint:staged`     | Lint only staged files in `packages/backend-utils/` using Biome (filters by file extension).             |
| `pnpm lint`            | Run Biome linting across the entire package.                                                             |

## 📦 Exports

The package exposes:

```json
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.js",
        "import": "./dist/index.js",
        "require": "./dist/index.js"
      }
    },
    "./helpers": {
      "import": {
        "types": "./dist/helpers/index.d.js",
        "import": "./dist/helpers/index.js",
        "require": "./dist/helpers/index.js"
      }
    },
    "./schemas": {
      "import": {
        "types": "./dist/schemas/index.d.js",
        "import": "./dist/schemas/index.js",
        "require": "./dist/schemas/index.js"
      }
    }
  },
```

| Path | Description |
|:--|:--|
| `@sirena/backend-utils/helpers` | Helpers for hono, like apiResponses for openApi. |
| `@sirena/backend-utils/schemas` | Zod schema for backend. |
