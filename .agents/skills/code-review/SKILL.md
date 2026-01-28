---
name: code-review
description: Perform code reviews for DNUM-SocialGouv (Hono.js, Prisma, TypeScript). Use when reviewing PRs, changesets, or code quality. Covers security, performance, testing, and design review.
---

# Code Review (DNUM-SocialGouv)

Follow these guidelines when reviewing code in this repository.

## Review Checklist

### Identifying Problems

Look for these issues in code changes:

- **Runtime errors**: null/undefined access, missing guards, unsafe parsing
- **Performance**: N+1 queries, unnecessary eager loads, large payloads
- **Side effects**: unintended changes across features or middleware
- **Backwards compatibility**: breaking API changes without migration path
- **Prisma queries**: missing `select/include`, unbounded `findMany`, bad filters
- **Security**: auth gaps, role checks missing, unsafe file handling, leaked data

### Design Assessment

- Does the change align with the feature structure (`route/controller/service/schema/type`)?
- Are responsibilities split correctly (controller vs service)?
- Does the change respect existing middleware order and auth patterns?

### Test Coverage

Every PR should have appropriate test coverage:

- Controller tests for request/response behavior (Hono `testClient`)
- Service tests for Prisma logic and edge cases
- Add error-case tests when API returns 4xx/5xx

### Long-Term Impact

Flag for senior review when changes involve:

- Database schema or migrations
- API contract changes
- New dependencies/frameworks
- Performance-critical paths
- Security-sensitive features (auth, file uploads, permissions)

## Feedback Guidelines

### Tone

- Be polite and direct
- Provide actionable suggestions
- Ask clarifying questions when unsure

### Approval

- Approve if only minor issues remain
- Don’t block on stylistic preferences alone

## Common Patterns to Flag

### Prisma (N+1)

```ts
// Bad: N+1
const users = await prisma.user.findMany();
for (const user of users) {
  await prisma.profile.findUnique({ where: { userId: user.id } });
}

// Good: include or batch
const users = await prisma.user.findMany({ include: { profile: true } });
```

### Hono controllers

```ts
// Bad: missing auth/role guard
app.get('/admin', async (c) => c.json({ data: [] }));

// Good: enforce middleware
app
  .use(authMiddleware)
  .use(roleMiddleware([ROLES.SUPER_ADMIN]))
  .get('/admin', async (c) => c.json({ data: [] }));
```

### Security

```ts
// Bad: trusting user input in Prisma where
prisma.user.findMany({ where: { roleId: c.req.query('roleId') } });

// Good: validate input with zod
const { roleId } = c.req.valid('query');
```
