# E2E Tests Documentation

## Targets

Tests run against one of two targets, selected with `E2E_TARGET`:

- **`integration`** (default): tests hit the deployed environment and authenticate through the real ProConnect flow. This is what CI runs.
- **`local`**: tests hit a local stack (`FRONTEND_URI=http://localhost:5173`) and authenticate by forging the `auth_token` cookie, without calling ProConnect. Useful to iterate quickly on component/selector changes.

The backend is never modified: the auth middleware already accepts any `auth_token` signed with `AUTH_TOKEN_SECRET_KEY` for an existing user, so local mode only signs that cookie from the test side.

### Running locally (no ProConnect)

1. Start the local stack (`pnpm dev`) with a database seeded with the e2e profile (`pnpm op:seed:e2e`).
2. In the root `.env` (see `.env.example`), set:
   - `E2E_CI=false`
   - `E2E_ENTITY_ADMIN_USER_1_EMAIL` to the email of a seeded user: `user19@yopmail.com` with the e2e profile. The password is not needed in local target.
   - `AUTH_TOKEN_SECRET_KEY`, `AUTH_TOKEN_NAME`, `IS_LOGGED_TOKEN_NAME` and `PG_URL`, with the same values as the local backend.
3. Clear any cached auth state tied to another target: `rm -rf apps/frontend/playwright/.auth/`.
4. Run:
   ```bash
   E2E_TARGET=local FRONTEND_URI=http://localhost:5173 PW_TEST_HTML_REPORT_OPEN=never \
     pnpm --filter @sirena/frontend exec playwright test --reporter=line
   ```

The seeded user id is resolved by email through Prisma (`PG_URL`), so it stays valid across reseeds. The forged cookie is valid for 12h: in local target, a cached auth file whose `auth_token` expires within 5 minutes is regenerated automatically. The `login-incognito` / `logout-incognito` specs are ProConnect-specific and are skipped in local target.

## E2E Authentication

### Overview
E2E tests use Playwright browser context persistence to skip repeated ProConnect logins.

### Requirements

#### Admin tests
 * Prerequisites:
 * - At least 2 users with same entiteId in "Gestion des utilisateurs" table
 * - Authenticated user has ENTITY_ADMIN role

#### Home Requetes
 * Prerequisites:
 * - At least 1 requete in "/home" table
 * - Authenticated user has ENTITY_ADMIN role

#### Request Details E2E TESTS
 * Prerequisites:
 * - At least 1 requête exists in "/home"
 * - User has ENTITY_ADMIN role

### How it works

**Why:** ProConnect authentication is slow (~10-15s) and repetitive for each test. Instead of logging in every time, we save the browser state after the first login.

**How:** Playwright saves browser context (cookies, localStorage, sessionStorage) to `.auth/${email}.json`. This file contains all authentication data needed to bypass the ProConnect flow.

- First run: Login via ProConnect → Save context to `.auth/${email}.json`
- Next runs: Load saved context → Skip login entirely
- Rate limiting prevents "too many requests" errors

### Key Functions
- `ensureAuthenticated()`: Reuse context or login if needed
- `forceNewAuthentication()`: Force new login
- `getCurrentUserId()`: Get user ID from context

### Usage Example
```typescript
const authFile = await ensureAuthenticated(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
const context = await browser.newContext({ storageState: authFile });
```

### Environment Variables
- `E2E_TARGET` (`integration` default, or `local`)
- `FRONTEND_URI`
- `E2E_CI`
- `E2E_ENTITY_ADMIN_USER_1_EMAIL`
- `E2E_ENTITY_ADMIN_USER_1_PASSWORD` (integration target only)
- `AUTH_TOKEN_SECRET_KEY`, `AUTH_TOKEN_NAME`, `IS_LOGGED_TOKEN_NAME` + `PG_URL` (local target only)

### Troubleshooting
```bash
rm -rf playwright/.auth/  # Clear auth cache if issues
``` 