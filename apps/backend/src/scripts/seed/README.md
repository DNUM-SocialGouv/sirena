# Seed CLI (SIRENA-683)

Interactive CLI to fill a **local** database with test users and varied requests.

```bash
pnpm op:seed            # interactive
pnpm op:seed --seed=42  # deterministic faker run
```

## What it asks

1. **Reset** the DB first (`prisma migrate reset` → `generate` → `build`).
2. **Create test users** — 3 defaults + one per role, plus custom ones.
3. **How many manual requests** (recommended 11: one per case family).
4. **DematSocial requests** — generate fakes, run the real import, or none.
5. **Enable feature flags** locally.

A recap is shown before running, and a final summary lists the created users
(log in via ProConnect by email) and generated request ids.

## Default users

| Email | Role | Entité |
|-------|------|--------|
| `user@yopmail.com` | SUPER_ADMIN | — |
| `user18@yopmail.com` | ENTITY_ADMIN | ARS Normandie |
| `user19@yopmail.com` | ENTITY_ADMIN | ARS Île-de-France |
| `reader@` / `writer@` / `pilotage@` / `pending@` | one per remaining role | ARS Normandie / — |

Users are upserted by email (idempotent). `user@yopmail.com` gets SUPER_ADMIN
regardless of `SUPER_ADMIN_LIST_EMAIL` (the role is forced in DB).

## Architecture

Recipes vs cook: **families** describe *what* a request is (plain data), the
**graph builder** is the only module that knows the Prisma schema.

| File | Role |
|------|------|
| `prompts.ts` | interactive questions → `SeedConfig` |
| `reset.ts` / `dematSocialImport.ts` | spawn existing pnpm scripts |
| `users.factory.ts` / `featureFlags.factory.ts` | idempotent upserts |
| `referentials.ts` | loads enum tables at runtime (no hardcoded ids) |
| `families.ts` | the 11 case families (edit here to add a case) |
| `graph.builder.ts` | the writer (edit here on a schema change) |
| `requetes.factory.ts` | plans and writes requests (manual + DematSocial) |

## Isolation

No prod code is modified. The CLI writes its own graph via Prisma and only reuses
the request-id **format** (locally, without the Redis lock) so it starts without
Redis/Minio. The real DematSocial import reuses `op:import:dematsocial` as-is.

## Maintenance

- Add a case → add a family in `families.ts`.
- A schema change breaks `pnpm --filter @sirena/backend typecheck` on the builder
  (note: `build` excludes `src/scripts`, so **typecheck** is the check that covers this code).
