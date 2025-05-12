# @sirena/ui

**UI component library** for the Sirena project.  
Built with **React 19**, **Storybook**, **TypeScript**, and tested with **Vitest**.

---

## 📦 Repository structure

```plaintext
./src/components/   → Each UI component has its own folder.
./.storybook/       → Storybook configuration using Vite and React..
./index.ts          → Re-exports all components for easy imports.
src/routes/       → Pages managed by TanStack Router.
src/stores/       → Zustand stores for global state.
src/scripts/      → Utility scripts (e.g., generate OpenAPI types).
src/types/        → Type definitions (e.g., OpenAPI generated types).
```

### structure exemple

```plaintext
packages/
└── ui/
    ├── src/
    │   ├── components/
    │   │   ├── LoginButton/
    │   │   │   ├── LoginButton.tsx
    │   │   │   ├── LoginButton.stories.tsx
    │   │   │   ├── LoginButton.test.tsx
    │   │   │   ├── LoginButton.types.ts (optional)
```

## 🚀 Scripts

| Command | Description |
|:--|:--|
| `pnpm run storybook` | Launch Storybook locally at [http://localhost:6006](http://localhost:6006) |
| `pnpm run build-storybook` | Build a static version of Storybook |
| `pnpm run test` | Run unit tests using Vitest |

## 💡 Example Usage

```ts
import { LoginButton } from '@sirena/ui';

function Example() {
  return (
    <div className="p-2">
      <LoginButton label="Welcome from @sirena/ui" />
    </div>
  );
}
```
