# Contributing to This Project

Thank you for your interest in improving this project. To keep our workflow clear and efficient, please follow these guidelines.

---

## 🔄 Git Workflow

### Branches

* **`main`** : Main development branch

  * All working branches are created from `main`
  * Automatic deployment to the integration environment
  * Should never be deleted

* **`validation`** : Release candidate branch

  * Hard rebased onto `main` at the start of a release (`git reset --hard origin/main`, then a
    force push), which also deploys it to the validation environment
  * QA fixes are pushed directly to this branch, then brought back to `main` through a
    `validation → main` PR
  * Should never be deleted

There is **no `production` branch**. Formation, preproduction and production are deployed from a
`vX.Y.Z` tag cut on `validation`, through the `manual-deploy` workflow (manual dispatch). Never
rebase `main` onto `validation` — always merge `validation` into `main`.

The full release, hotfix and rollback procedures live in
[docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md).

### Working branches

Create working branches from `main`, prefixed by type and carrying the Jira reference when there
is one:

```
fix/sirena-818-pagination-bornee
feat/sirena-745-discussion-realtime
chore/update-deps-2026-09-28
```

> **Merge flows:**
>
> * working branch → `main` (PR)
> * `main` → `validation` (hard rebase, start of release)
> * `validation` → `main` (PR, to bring QA fixes back)
> * production hotfix: tag → `validation` (or a short-lived `hotfix/*`) → `main` (PR)

---

## Pre‑commit Hooks

We enforce quality checks on every commit using Husky:

* **`pnpm lint`** (Biome) — enforces code style and formatting.
* **`pnpm gitleaks:detect-secrets`** — scans for secrets in your commits.

A `commit-msg` hook also runs `commitlint` with `@commitlint/config-conventional`.
[convco](https://convco.github.io/) is a handy local companion: `convco commit` walks you through
a compliant message and `convco check` validates a commit range before you push.

Ensure these checks pass locally before pushing your code.

---

## Pull Request Process

1. **Sync**: Ensure your local `main` is up to date.
2. **Branch**: Create a new branch for your work as described above.
3. **Implement**: Make your changes and add or update tests as needed.
4. **Commit**: Use **Conventional Commits** (semantic commit messages) — e.g., `feat: add user login validation`, `fix: handle null pointer`, `chore: update dependencies`.
5. **Push**: Push your branch to the remote repository.
6. **PR**: Open a pull request targeting `main`. Fill in the PR description.
7. **Review**: Address feedback and ensure all CI checks pass.
8. **Merge**: After approval, merge your PR into `main`.

---

## Reporting Issues

If you encounter a bug or have a feature request:

1. Search existing issues to avoid duplicates.
2. Open a new issue with:

   * A clear title.
   * Detailed description of the problem or feature.
   * Steps to reproduce (if applicable).
   * Relevant logs or screenshots.

---

## Code Style & Standards

* Follow the existing code style (indentation, naming, etc.).
* Run linters and formatters before committing (`pnpm lint`).
* Write meaningful tests for new features and bug fixes.

Our day-to-day practices — repo layout, code conventions, tests, review, migrations, CI and
working with LLM assistants — are documented in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

---

Thank you for helping us keep this project healthy and high-quality! We appreciate your contributions.
