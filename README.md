# Sirena

a.k.a. SI reclamation

## 🚀 Getting Started

To use the project locally, make sure the following tools are installed:

- [**pnpm**](https://pnpm.io/installation) — for dependency management
- [**Docker**](https://www.docker.com/products/docker-desktop/) — for running PostgreSQL locally
- [**Gitleaks**](https://github.com/gitleaks/gitleaks/releases) — for pre-commit secret detection

To run the project locally, you’ll need a .env file at the root of the repo.

You can start by copying the example:

```bash
cp .env.example .env
```

and edit .env as needed.

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

## 🧪 Commands

| Command | Description |
|:--|:--|
| `pnpm dev` | Start frontend + backend in parallel |
| `pnpm dev:frontend` | Start frontend (`@sirena/frontend`) |
| `pnpm dev:backend` | Start backend (`@sirena/backend`) with `.env` |
| `pnpm dev:backend-bis` | Start alternate backend (`@sirena/backend-bis`) with `.env` |
| `pnpm build:backend` | Build backend to `dist/` (RPC + OpenAPI ready) |
| `pnpm build:backend-bis` | Build alternate backend |
| `pnpm db:migrate` | Run dev migrations (`@sirena/database`) with `.env` |
| `pnpm db:generate` | Generate Prisma client from schema (`@sirena/database`) with `.env` |
| `pnpm db:deploy` | Deploy pending migrations to DB (`@sirena/database`) with `.env` |
| `pnpm db:studio` | Open Prisma Studio (`@sirena/database`) with `.env` |
| `pnpm lint` | Run `lint` script in all packages (via `pnpm -r`) |
| `pnpm lint:staged` | Run staged file linter in each workspace |
| `pnpm gitleaks` | Scan staged files for secrets using [Gitleaks](https://github.com/gitleaks/gitleaks) |
| `pnpm prepare` | Install Husky Git hooks (called automatically by `pnpm install`) |

## 🛠️ Tools

### 🧰 Tooling

- **[pnpm](https://pnpm.io)** — Fast, efficient monorepo package manager.
- **[Docker](https://www.docker.com)** — Used to run PostgreSQL locally.
- **[pkgroll](https://github.com/unjs/pkgroll)** — ESM build system for the backend.
- **[tsx](https://github.com/esbuild-kit/tsx)** — Instantly run TypeScript files (used for dev/start/scripts).
- **[biome](https://biomejs.dev)** — All-in-one linter, formatter, and type checker.
- **[dotenv-cli](https://github.com/entropitor/dotenv-cli)** — Load `.env` files when running scripts.
- **[gitleaks](https://github.com/gitleaks/gitleaks)** — Secret scanner that prevents committing API keys or credentials.

### 🧹 Lint

- **[Biome](https://biomejs.dev)** — Used for formatting, linting, and type checking.
  - Recommended: install the [Biome VSCode extension](https://biomejs.dev/reference/vscode/)

### 🧠 Backend

- **[Hono](https://hono.dev)** — Fast, typed web framework.
- **[Prisma](https://prisma.io)** — Type-safe ORM for database modeling and access.
- **[Zod](https://github.com/colinhacks/zod)** — Runtime schema validation.
- **[zod-openapi](https://github.com/asteasolutions/zod-to-openapi)** — Generate OpenAPI schemas from Zod.

### 🎨 Frontend

- **[React](https://react.dev)** — UI library used in the frontend app.
- **[react-dsfr](https://react-dsfr.codegouv.studio/)** — Design system based on the French government’s DSFR.
- **[@tanstack/react-query](https://tanstack.com/query/latest)** — Data fetching and caching.
- **[@tanstack/react-router](https://tanstack.com/router)** — Fully typed SPA routing.
- **[Vite](https://vite.dev)** — Fast dev/build tool.

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
