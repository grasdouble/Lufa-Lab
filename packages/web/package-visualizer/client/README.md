# Client — Package Visualizer

React + Vite + TypeScript web app. Runs on port `5173` in dev mode.

## Dev

```bash
pnpm --filter @package-visualizer/client dev
```

Requires the server to be running on port `3001` (see [`../server/README.md`](../server/README.md)).

## Stack

- React 19
- Vite
- TypeScript
- Shiki (`github-dark`) for syntax highlighting

## Project structure

```
src/
├── App.tsx
├── api/index.ts            # API calls to the Express server
├── hooks/useGitHubAuth.ts  # reads/stores the access token from URL fragment + localStorage
└── components/
    ├── SearchBar.tsx
    ├── VersionPicker.tsx
    ├── FileTree.tsx
    ├── FileViewer.tsx
    └── GitHubAuthButton.tsx
```

## Authentication

After OAuth, the server redirects back to the client with the token in the URL fragment (`#access_token=...`). The client reads it, stores it in `localStorage` under `gh_access_token`, and attaches it to every subsequent API call.

> The token is passed in the fragment (not the query string) so it is never sent to the server by the browser.

## Manual token fallback

If you don't want to set up an OAuth app, click **"Utiliser un token manuellement"** in the search page and paste a personal access token with the `read:packages` scope.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
