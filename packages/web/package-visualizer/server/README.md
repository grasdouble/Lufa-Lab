# Server — Package Visualizer

Express + TypeScript API. Runs on port `3001` in dev mode.

## Dev

```bash
pnpm --filter @package-visualizer/server dev
```

## Configuration

Create `server/.env`:

```env
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

See `.env.example` for reference.

### GitHub OAuth App setup

The server acts as an OAuth middleman. This is necessary because the GitHub OAuth flow requires a `CLIENT_SECRET` to exchange an authorization code for an access token — and a secret can never be exposed in browser-side code.

The flow works like this:
1. The client redirects the user to GitHub with the `CLIENT_ID` (public)
2. GitHub redirects back to the **server** at `/api/auth/callback` with a temporary `code`
3. The server exchanges `code` + `CLIENT_SECRET` → `access_token` (this call stays server-side)
4. The server sends the `access_token` back to the client via the URL fragment (`#access_token=...`)

Without the server, the only alternative is a personal access token (PAT) — which the client supports as a manual fallback.

**Setup:**

1. Go to **GitHub → Settings → Developer settings → OAuth Apps** and click **"New OAuth App"**
2. Fill in the form:

   | Field | Value |
   |---|---|
   | Homepage URL | `http://localhost:5173` |
   | Authorization callback URL | `http://localhost:3001/api/auth/callback` |

   > The callback URL must point to the Express server, not the Vite dev server.

3. Copy the **Client ID** and generate a **Client Secret**, then put them in `.env`.

## Project structure

```
src/
├── index.ts
├── routes/
│   ├── auth.ts           # GET /api/auth/login, /api/auth/callback, /api/auth/user
│   └── package.ts        # GET /api/package/* — metadata, download, file, cache
└── services/
    └── packageService.ts
```

## Notes

- Downloaded packages are cached in `os.tmpdir()/pkg-visualizer-cache/<name>@<version>/`. The cache is reused on subsequent loads as long as the directory is non-empty.
- The Vite dev server proxies `/api/*` to `http://localhost:3001`. OAuth login redirects must point directly to `http://localhost:3001/api/auth/login` because browser redirects bypass the Vite proxy.
