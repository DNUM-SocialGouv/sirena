# Seed CLI (SIRENA-683)

Interactive CLI to fill a **local** database with test users and varied requests.

```bash
pnpm op:seed            # interactive
pnpm op:seed --seed=42  # deterministic faker run
pnpm op:seed:e2e        # non-interactive e2e profile (reset + seed)
```

## e2e profile (SIRENA-791)

`pnpm op:seed:e2e` runs a **static, non-interactive** profile (`profiles.ts`):
no prompts, no confirmation. It is the same engine as the interactive seed, just
with a fixed `SeedConfig`. Equivalent to `pnpm op:seed --e2e`
(or `SEED_PROFILE=e2e`).

Profile config: `reset: true`, default users, `11` manual requests per ARS,
`dematSocial: NONE`, feature flags on, **constant faker seed** and a fixed reference
date (`2026-09-16T12:00:00.000Z`) for request ids and relative Faker dates.
Each run resets the DB and rebuilds reproducible generated business data;
Prisma-generated ids and automatic database timestamps remain variable.
Interactive runs keep using the current date.

The seed reads `E2E_ENTITY_ADMIN_USER_1_EMAIL`, just like the E2E suite, falling
back to `user19@yopmail.com`. Pass the same value to both commands. In CI, the
test workflow receives it from `vars.TEST_USER_EMAIL`; any seed step must also
receive this variable. A custom email is created as an ENTITY_ADMIN on ARS
Île-de-France and receives the fixed test user id. Default users are still seeded.

**State produced**

- the configured test user (`user19@yopmail.com` by default) — ENTITY_ADMIN, ARS Île-de-France, fixed id;
- at least one more user on the same ARS (`pilotage@yopmail.com`);
- the full family set of manual requests on both ARS, **plus 1–2 shared
  multi-entité requests**, each non-clôturée and with its default steps;
- feature flags enabled.

So `admin`, `homeRequetes` and `requetesDetails` all have the data they assume.

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
