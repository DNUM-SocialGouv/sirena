# @sirena/backend

**Backend package** of the Sirena project.  
Built with [Hono](https://hono.dev/), [Zod](https://github.com/colinhacks/zod), and OpenAPI-first design.  
Compiled using [`tsc`](https://github.com/microsoft/TypeScript).

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
│   └── roles/
│       ├── roles.controller.ts
│       ├── roles.route.ts
│       ├── roles.schema.ts
│       └── roles.service.ts
├── hc.ts               → RPC-style client factory using `hono-client`.
├── helpers/            → Internal helpers, error utils.
├── middlewares/        → Custom middlewares (e.g., logger).
├── schemas/            → Shared schemas (e.g., error format).
├── swagger/            → OpenAPI generation and static export.
├── types/              → Type declarations shared across codebases.
└── index.ts            → Main entry point (server bootstrap).
```

## 🚀 Scripts

| Command                 | Description                                                                   |
| :---------------------- | :---------------------------------------------------------------------------- |
| `pnpm build`            | Compile TypeScript sources using `tsconfig.build.json`                        |
| `pnpm dev`              | Start the backend in development mode with `tsx` watching `src/index.ts`      |
| `pnpm test`             | Run unit tests using Vitest                                                   |
| `pnpm db:generate`      | Generate the Prisma client from the schema                                    |
| `pnpm db:migrate`       | Apply pending migrations in development (`prisma migrate dev`)                |
| `pnpm db:diff`          | Create a SQL migration script comparing an empty DB to the current schema     |
| `pnpm db:deploy`        | Deploy all pending migrations to the database (`prisma migrate deploy`)       |
| `pnpm db:reset`         | Reset the database by dropping and recreating it with migrations (`--force`)  |
| `pnpm db:push`          | Push the Prisma schema directly to the database without generating migrations |
| `pnpm db:studio`        | Launch Prisma Studio UI for exploring and modifying the database              |
| `pnpm generate:openAPI` | Run a custom TypeScript script to generate the OpenAPI specification          |
| `pnpm lint:staged`      | Run Biome lint checks on staged backend files via a Git diff filter           |
| `pnpm lint`             | Run Biome lint checks across the entire backend codebase                      |


## 📦 Exports

The package exposes:

```json
  "exports": {
    ".": {
      "import": {
        "types": "./dist/src/index.d.ts",
        "default": "./dist/src/index.js"
      }
    },
    "./swagger": "./src/swagger/openAPI.json",
    "./hc": {
      "import": {
        "types": "./dist/src/hc.d.ts",
        "default": "./dist/src/hc.js"
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
