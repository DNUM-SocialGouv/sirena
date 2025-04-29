# Sirena

a.k.a. SI reclamation

## 🚀 Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. launch PostgreSQL

```bash
docker compose up
# if first launch (if no migrations add --name <name>)
pnpm db:migrate
```

### 2. Generate prisma types

```bash
pnpm db:generate
```

### 3. Build backend to create rpc

```bash
pnpm backend:build
```

### 4. Start development servers

```bash
pnpm dev
```

## 📦 Monorepo structure

```plaintext
apps/
├── frontend      → React app using TanStack Router + DSFR + RPC client
├── backend       → API server using Hono + Zod + OpenAPI
├── backend-bis   → Experimental/alt backend (same tech stack)
packages/
├── ui            → Design system / reusable components (Storybook)
├── database      → Prisma schema, types, and zod validation
```

## 🧩 Core scripts

| Command | Description |
|:--|:--|
| `pnpm dev` | Start frontend + backend in parallel |
| `pnpm dev:frontend` | Start frontend (`@sirena/frontend`) |
| `pnpm dev:backend` | Start backend (`@sirena/backend`) |
| `pnpm dev:backend-bis` | Start alternate backend (`@sirena/backend-bis`) |
| `pnpm build:backend` | Build backend to `dist/` (RPC + OpenAPI ready) |
| `pnpm db:migrate` | Run dev migrations (via `@sirena/database`) |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:deploy` | Deploy pending migrations |
| `pnpm db:studio` | Open Prisma Studio |

## 🛠️ Tools

### Lint

for linting we use [biome](https://biomejs.dev/)

you can install the vscode extension from [https://biomejs.dev/reference/vscode/](https://biomejs.dev/reference/vscode/)

### Backend

- [hono](https://hono.dev)
- [prisma](https://prisma.io)

### Frontend

- [react-dsfr](https://react-dsfr.codegouv.studio/)
- [tanstack-query](https://tanstack.com/query/latest)
- [vite](https://vite.dev)

### tools

- [pnpm](https://pnpm.io)
- [docker](https://docker.io)

## 🔗 Internal packages

| Package | Description |
|:--|:--|
| [`@sirena/ui`](./packages/ui) | Reusable design system components (with Storybook) |
| [`@sirena/backend`](./apps/backend) | Main Hono backend with OpenAPI + RPC |
| [`@sirena/backend-bis`](./apps/backend-bis) | Experimental backend variant |
| [`@sirena/database`](./packages/database) | Prisma schema, zod types, and client |
| [`@sirena/frontend`](./apps/frontend) | Full React SPA using TanStack Router + Query |
