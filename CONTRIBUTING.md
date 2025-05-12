# Contributing to This Project

Thank you for your interest in improving this project. To keep our workflow clear and efficient, please follow these guidelines.

---

## 🔄 Git Workflow

### Branches

* **`main`** : Main development branch

  * All feature branches are created from `main`
  * Automatic deployment to development environment
  * Should never be deleted

* **`validation`** : Validation branch

  * Merge from `main` at the end of sprints (or more frequently if needed)
  * Deployment to validation environment
  * Hotfixes in validation are pushed to this branch
  * Hotfixes must be backported to `main` via a PR and merge
  * Should never be deleted

* **`production`** : Production branch

  * Merge from `validation` for production deployments
  * Deployment to production environment
  * Hotfixes in production are pushed to this branch
  * Hotfixes must be backported to `validation` then `main` via PRs and merges
  * Should never be deleted

> **Merge flows:**
>
> * PR → `main`
> * `validation` → `main`
> * `production` → `validation` → `main`

---

## Pre‑commit Hooks

We enforce quality checks on every commit using Husky:

* **`pnpm lint`** (Biome) — enforces code style and formatting.
* **`pnpm gitleaks`** — scans for secrets in your commits.

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

---

Thank you for helping us keep this project healthy and high-quality! We appreciate your contributions.
