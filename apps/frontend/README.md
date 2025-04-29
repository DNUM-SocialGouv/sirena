# @sirena/frontend

**Frontend application** for the Sirena project.  
Built with **React 19**, **Vite 6**, **TanStack Router**, and **TypeScript**.

## 📚 Main project paths

```plaintext
src/assets/             → Static assets like images or SVGs.
src/components/common/  → Reusable atomic UI components (e.g., buttons, inputs).
src/components/layout/  → Structural layout components (e.g., headers, footers).
src/hooks/              → Query and mutation hooks using TanStack React Query.
src/lib/                → API utilities (OpenAPI-based clients, HTTP helpers).
src/routes/             → Application pages managed by TanStack Router.
src/stores/             → Zustand stores for global state management.
src/scripts/            → Utility scripts (e.g., OpenAPI codegen).
src/styles/             → Global styles, tokens, Tailwind or CSS modules.
src/types/              → Global TypeScript definitions (e.g., OpenAPI models).
src/utils/              → Pure utility functions (formatters, helpers, etc.).
```

## 🚀 Scripts

| Command | Description |
|:--|:--|
| `pnpm run predev` | Update icons automatically before dev (`react-dsfr`). |
| `pnpm run prebuild` | Update icons automatically before build (`react-dsfr`). |
| `pnpm run dev` | Start the Vite dev server (accessible from local network). |
| `pnpm run build` | Build the TypeScript files and Vite production build. |
| `pnpm run lint` | Run biome on the project. |
| `pnpm run preview` | Preview the built application locally. |
| `pnpm run generate:openAPI` | Generate OpenAPI TypeScript types from `openAPI.ts` script. |
