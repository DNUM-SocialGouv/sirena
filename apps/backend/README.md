# @sirena/backend

**Backend package** of the Sirena project.  
Built with [Hono](https://hono.dev/), [Zod](https://github.com/colinhacks/zod), and OpenAPI-first design.  
Compiled using [`pkgroll`](https://github.com/unjs/pkgroll) with ESM output.

---

## 📦 Project structure

```plaintext
src/
├── app.ts              → App entry (Hono instance).
├── features/           → Feature-based routes, services, schemas.
│   └── users/
│       ├── users.controller.ts
│       ├── users.route.ts
│       ├── users.schema.ts
│       └── users.service.ts
├── hc.ts               → RPC-style client factory using `hono-client`.
├── helpers/            → Internal helpers, error utils.
├── middlewares/        → Custom middlewares (e.g., logger).
├── schemas/            → Shared schemas (e.g., error format).
├── swagger/            → OpenAPI generation and static export.
├── types/              → Type declarations shared across codebases.
└── index.ts            → Main entry point (server bootstrap).
```

## 🚀 Scripts

| Command | Actual Script | Description |
|:--|:--|:--|
| `pnpm run dev` | `tsx watch --clear-screen=false src/index.ts` | Start the backend in dev mode with live reload. |
| `pnpm run build` | `pkgroll --tsconfig tsconfig.build.json` | Build the backend using pkgroll (outputs to `dist/`). |
| `pnpm run lint` | `biome check ./src/` | Run Biome linter on source files. |
| `pnpm run generate:openAPI` | `tsx src/swagger/gen-openAPI-swagger.ts` | Generate OpenAPI schema JSON using `zod-openapi`. |

## 📦 Exports

The package exposes:

```json
"exports": {
  "./swagger": "./src/swagger/openAPI.json",
  "./hc": {
    "import": {
      "default": "./dist/hc.js",
      "types": "./dist/hc.d.ts"
    }
  }
}
```

| Path | Description |
|:--|:--|
| `@sirena/backend/hc` | Hono-compatible typed client (`hcWithType`) for RPC-style API access. |
| `@sirena/backend/swagger` | The OpenAPI schema JSON, usable by frontend generators or previewers. |

### 💡 Example: Using the typed client

```ts
import { hcWithType } from '@sirena/backend/hc';

const client = hcWithType('/api');

export async function fetchUserById(id: string) {
  const res = await client.users[':id'].$get({ param: { id } });
  if (!res.ok) throw new Error('Failed to fetch user');
  return await res.json();
}
```
