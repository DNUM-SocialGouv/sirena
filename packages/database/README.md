# @sirena/database

**Database package** for the Sirena project.  
Built with **Prisma ORM**, **Zod** for validation, and **TypeScript** for type safety.

---

## 📦 Repository structure

```plaintext
packages/
└── database/
    ├── src/
    │   ├── index.ts
    │   ├── zod.ts
    ├── prisma/
    │   ├── schema.prisma
    ├── package.json
```

## 🚀 Scripts

| Command | Actual Script | Description |
|:--|:--|:--|
| `pnpm run db:generate` | `prisma generate` | Generate the Prisma client from `schema.prisma`. |
| `pnpm run db:migrate` | `prisma migrate dev` | Apply local migrations and update your database. |
| `pnpm run db:diff` | `prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script` | Generate an SQL script diff from an empty state to your current schema. |
| `pnpm run db:deploy` | `prisma migrate deploy` | Deploy all pending migrations to a production/staging database. |
| `pnpm run db:reset` | `prisma migrate reset` | Drop, recreate, and apply all migrations — useful for dev. |
| `pnpm run db:push` | `prisma db push` | Push the schema to your database without generating a migration. |
| `pnpm run db:studio` | `prisma studio` | Open Prisma Studio (visual DB browser). |

## 📦 Exports

This package exposes two entry points via the exports field in package.json:

```jsopn
"exports": {
  ".": "./src/index.ts",
  "./zod": "./src/zod.ts"
}
```

| Import path | Description |
|:--|:--|
| `@sirena/database` | Main Prisma client + DB utils (from `src/index.ts`). |
| `@sirena/database/zod` | Zod validation schemas (from `src/zod.ts`). |

## 💡 Example Usage

### ✅ Zod schema validation

```ts
import zod from '@sirena/database/zod';

const UserSchema = zod.UserSchema;

UserSchema.parse({
  id: 'clzabc123456',
  email: 'john@example.com',
  name: 'John',
});
```

✅ Prisma client + type-safe usage

```ts
import { type User, prisma } from '@sirena/database';

export const getUserById = async (id: User['id']) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};
```
