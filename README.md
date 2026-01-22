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

and edit .env as needed (at least the PG_* variables).
you can create an application for the login [here](https://partenaires.proconnect.gouv.fr/) to complete the required informations on the frontend .env

Additional environment variables:
- `LOG_EXTRA_CONTEXT` - Include extra context in logs (tags, comma separated, e.g., `foo=bar,baz=bat`)
- `TRUSTED_IP_HEADERS` - Comma-separated list of trusted IP headers (e.g., `x-forwarded-for,x-real-ip`)

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
pnpm build:backend
```

### 4. Start development servers

```bash
pnpm dev
```

### 5. create project in ProConnect for login and logout

create your account and project on [this url](https://partenaires.proconnect.gouv.fr/)

- Setup your env var with the given Client ID and Client Secret
- Setup `http://localhost:5173/api/auth/callback` on login url redirection
- Setup `http://localhost:5173/login` on logout url redirection

## 📦 Monorepo structure

```plaintext
apps/
├── frontend      → React app using TanStack Router + DSFR + RPC client
├── backend       → API server using Hono + Zod + OpenAPI
packages/
├── ui            → Design system / reusable components (Storybook)
```

## 🧪 Commands

| Command                                | Description                                                                          |
| :------------------------------------- | :----------------------------------------------------------------------------------- |
| `pnpm dev`                             | Start frontend + backend in parallel                                                 |
| `pnpm dev:frontend`                    | Start frontend (`@sirena/frontend`)                                                  |
| `pnpm dev:backend`                     | Start backend (`@sirena/backend`) with `.env`                                        |
| `pnpm dev:backend-utils`               | Start backend-utils (`@sirena/backend-utils`)                                        |
| `pnpm dev:common`                      | Start common (`@sirena/common`)                                                      |
| `pnpm dev:ui`                          | Start storybook (`@sirena/ui`)                                                       |
| `pnpm build:backend`                   | Build backend to `dist/` (RPC + OpenAPI ready)                                       |
| `pnpm build:frontend`                  | Build frontend to `dist/`                                                            |
| `pnpm build:backend-utils`             | Build backend-utils to `dist/`                                                       |
| `pnpm build:common`                    | Build common to `dist/`                                                              |
| `pnpm db:migrate`                      | Run dev migrations (`@sirena/backend`) with `.env`                                   |
| `pnpm db:migrate:resolve`              | Run dev migrations (`@sirena/backend`) with `.env`                                   |
| `pnpm db:generate`                     | Generate Prisma client from schema (`@sirena/backend`) with `.env`                   |
| `pnpm db:seed`                         | Apply seeds to the database (`@sirena/backend`) with `.env`                          |
| `pnpm db:deploy`                       | Deploy pending migrations to DB (`@sirena/backend`) with `.env`                      |
| `pnpm db:studio`                       | Open Prisma Studio (`@sirena/backend`) with `.env`                                   |
| `pnpm db:reset`                        | Reset the database (`@sirena/backend`) with `.env`                                   |
| `pnpm backend:codegen`                 | Generate clients for graphql requests                                                |
| `pnpm test:e2e`                        | Run end-to-end tests for frontend (`@sirena/frontend`)                               |
| `pnpm test:e2e:ui`                     | Run end-to-end tests with UI for frontend (`@sirena/frontend`)                       |
| `pnpm test:unit`                       | Run unit tests across all packages                                                   |
| `pnpm lint`                            | Run `lint` script in all packages (via `pnpm -r`)                                    |
| `pnpm lint:staged`                     | Run staged file linter in each workspace                                             |
| `pnpm gitleaks:detect-secrets`         | Scan staged files for secrets using [Gitleaks](https://github.com/gitleaks/gitleaks) |
| `pnpm gitleaks:update-ignored-secrets` | Update the list of ignored secrets for Gitleaks scripts                              |
| `pnpm prepare`                         | Install Husky Git hooks (called automatically by `pnpm install`)                     |

## 🛠️ Tools

### 🧰 Tooling

- **[pnpm](https://pnpm.io)** — Fast, efficient monorepo package manager.
- **[Docker](https://www.docker.com)** — Used to run PostgreSQL locally.
- **[tsc](https://github.com/microsoft/TypeScript)** — ESM build system for the backend.
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
- **[graffle](https://graffle.js.org/)** — Client to make Graphql calls.
- **[graphql-codegen](https://the-guild.dev/graphql/codegen)** — Client to generate code for Graphql schemas. 

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
| [`@sirena/common`](./pacakges/common) | package sharing elements from backend end frontend |
| [`@sirena/backend-utils`](./pacakges/backend-utils) | package for exporting element to other projects |
| [`@sirena/frontend`](./apps/frontend) | Full React SPA using TanStack Router + Query |

## Docker build

```bash
docker compose -f docker-compose.prod.yaml up
```

## 🔄 Git Workflow

### Branches

- **`main`** : Main development branch
  - All feature branches are created from `main`
  - Automatic deployment to development environment
  - Should never be deleted

- **`validation`** : Validation branch
  - Merge from `main` at the end of sprints (or more frequently if needed)
  - Deployment to validation environment
  - Hotfixes in validation are pushed to this branch
  - Hotfixes must be backported to `main` via a PR and merge
  - Should never be deleted

- **`production`** : Production branch
  - Merge from `validation` for production deployments
  - Deployment to production environment
  - Hotfixes in production are pushed to this branch
  - Hotfixes must be backported to `validation` then `main` via PRs and merges
  - Should never be deleted
