# @sirena/common

**Common package for backend and frontend** of the Sirena project.
The goal of this package is to share functionality between frontend and backend.
Compiled using [`tsc`](https://github.com/microsoft/TypeScript).

## 📦 Project structure

```plaintext
src/
├── index.ts            → Lib entry.
├── constants/          → Constants shared between front and back.
```

## 🚀 Scripts

| Command                | Description                                                                                              |
| :--------------------- | :------------------------------------------------------------------------------------------------------- |
| `pnpm build`           | Compile TypeScript files to JavaScript (runs `tsc`).                                                     |
| `pnpm dev`             | Run TypeScript in watch mode with output preserved (`tsc --watch --preserveWatchOutput`).                |
| `pnpm lint:staged`     | Lint only staged files in `packages/common/` using Biome (filters by file extension).                    |
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
    "./constants": {
      "import": {
        "types": "./dist/constants/index.d.js",
        "import": "./dist/constants/index.js",
        "require": "./dist/constants/index.js"
      }
    },
  },
```

| Path | Description |
|:--|:--|
| `@sirena/common/constants` | Constants used in frontend and backend (ex: error code). |
