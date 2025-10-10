# E2E Tests Documentation

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
- `E2E_ENTITY_ADMIN_USER_1_EMAIL` / `E2E_ENTITY_ADMIN_USER_1_PASSWORD`
- `FRONTEND_URI`

### Troubleshooting
```bash
rm -rf playwright/.auth/  # Clear auth cache if issues
``` 