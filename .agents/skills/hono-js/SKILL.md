---
name: hono-js
description: Hono API patterns for DNUM-SocialGouv (routes/controllers/services/schemas/types/tests, openapi helpers, zValidator, prisma). Trigger on "hono", "route", "controller", "service", "schema", "openapi".
---

# Hono.js (DNUM-SocialGouv)

Use this skill when adding or changing backend endpoints built with Hono in this repo.

## Project Structure

- Features live in `apps/backend/src/features/<feature-name>/`
- Files are named `<feature-name>.<file-type>.ts`
- Common file types: `route`, `controller`, `service`, `schema`, `type`, `test`

## Routes (OpenAPI)

- Route files only declare OpenAPI metadata (responses), not params.
- Use helpers from `@sirena/backend-utils/helpers`.

Example:

```ts
export const getUserRoute = openApiProtectedRoute({
  description: 'Get user by id',
  responses: {
    ...openApiResponse(GetUserResponseSchema),
    ...openApi404NotFound('User not found'),
  },
});
```

## Schemas

- Define request/response schemas (params, query, body, response).
- Use `paginationQueryParamsSchema` for `search/limit/offset/order`.

Example:

```ts
export const UserSchema = z.object({
  id: z.cuid(),
  email: z.email({ message: 'Invalid email address' }),
  prenom: z.string(),
  nom: z.string(),
  uid: z.string(),
  sub: z.string(),
  pcData: z.record(z.string(), z.string()),
  roleId: z.string(),
  statutId: z.string(),
  entiteId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const columns = [
  Prisma.UserScalarFieldEnum.email,
  Prisma.UserScalarFieldEnum.prenom,
  Prisma.UserScalarFieldEnum.nom,
] as const;

export const GetUsersQuerySchema = paginationQueryParamsSchema(columns).extend({
  roleId: z
    .string()
    .transform((val) => val.split(',').map((id) => id.trim()))
    .optional(),
  statutId: z
    .string()
    .transform((val) => val.split(',').map((id) => id.trim()))
    .optional(),
});
```

## Types

- Prefer `z.infer` from schemas.

Example:

```ts
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
```

## Controllers

- Build controllers from `factoryWithLogs.createApp()` for typed context.
- Chain middleware and routes in order.
- Use `zValidator` for query/body validation.
- Return `c.json({ data: ... }, status)`.

### Common Middleware

- `authMiddleware` (auth cookie/session)
- `userStatusMiddleware` (active user checks)
- `roleMiddleware([ROLES...])` (RBAC guard)
- `entitesMiddleware` (entite context)
- `pino.middleware` (logging)
- `sentry.middleware` (error context)
- `upload.middleware` (multipart handling)
- `logout.middleware`
- `changelog/*` (entity change tracking)

Example:

```ts
const app = factoryWithLogs
  .createApp()
  .use(authMiddleware)
  .use(userStatusMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]))
  .use(entitesMiddleware)
  .get('/:id', getUsersRoute, zValidator('query', GetUsersQuerySchema), async (c) => {
    // ...
    return c.json({ data: users }, 200);
  })
  .get('/:id', getUserRoute, async (c) => {
    // ...
    return c.json({ data: user }, 200);
  });
```

## Services

- Prisma calls live in `service` files.
- Keep logic small and composable.

Example:

```ts
export const getUsers = async (entiteIds: string[] | null, query: GetUsersQuery = {}) => {
  const { offset = 0, limit, sort = 'nom', order = 'asc', roleId, statutId, search } = query;

  const entiteFilter = filterByEntities(entiteIds);
  const roleFilter = filterByRoles(roleId ?? null);

  const searchConditions: Prisma.UserWhereInput[] | undefined = search?.trim()
    ? [
        { prenom: { contains: search, mode: 'insensitive' } },
        { nom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    : undefined;

  const where: Prisma.UserWhereInput = {
    ...(entiteFilter ?? {}),
    ...(roleFilter ?? {}),
    ...(statutId !== undefined ? { statutId: { in: statutId } } : {}),
    ...(searchConditions ? { OR: searchConditions } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      include: { role: true },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total };
};
```

## Tests

### Controller Tests (Hono)

- Prefer controller tests for endpoint behavior.
- Use `testClient` from `hono/testing`.
- Build app with `appWithLogs.createApp().use(pinoLogger()).route('/', Controller).onError(errorHandler)`.
- Use `client.index.$get()` or `client[':id'].$get()` with `query`/`param`/`json`.
- Keep test data minimal and focus on response status + body.
- Always cover success payload + at least one error case, with services mocked.

Example:

```ts
describe('Users endpoints: /users', () => {
  const app = appWithLogs.createApp().use(pinoLogger()).route('/', UsersController).onError(errorHandler);
  const client = testClient(app);

  describe('GET /', () => {
    it('returns filtered users', async () => {
      const res = await client.index.$get({
        query: { roleId: ROLES.NATIONAL_STEERING, statutId: 'ACTIF' },
      });
      // assert status + payload
    });
    it('returns 404 when user not found', async () => {
      // mock service to return null, assert 404 payload
    });
  });
});
```

Reference: `apps/backend/src/features/users/users.controller.test.ts`.
