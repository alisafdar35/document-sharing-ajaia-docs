# Ajaia Docs

A lightweight collaborative document editor — create rich-text documents, share them with
teammates, and edit together. Built as a TypeScript monorepo: a React + TipTap frontend and an
Express + Prisma API.

---

## Features

- **Rich-text editing** — headings, bold/italic/underline/strikethrough, inline code, code
  blocks, bullet and numbered lists, quotes, undo/redo. Powered by TipTap (ProseMirror).
- **Autosave** — edits are debounced and written back automatically, with a live
  "All changes saved" indicator and a Retry action if a save fails.
- **Sharing** — the owner grants edit access to other users; shared documents show up in the
  recipient's "Shared with me" list. Access can be revoked at any time.
- **Permissions enforced server-side** — the owner can rename, share and delete; a shared editor
  can only change content; everyone else gets a 403. The client is never trusted.
- **Import** — bring in a `.txt` or `.md` file (up to 1 MB); Markdown headings, lists, quotes,
  rules, code fences and inline formatting are converted into real editor content.
- **User switcher** — authentication is simulated for the exercise: pick any seeded user from the
  top-right menu and the whole app re-renders as that person.

## Tech stack

| Layer    | Choice                                                        |
| -------- | ------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TipTap, React Router |
| Backend  | Node, Express 4, TypeScript, Zod                               |
| Database | Prisma ORM — SQLite locally, PostgreSQL in production          |
| Tests    | Vitest + Supertest (60 API and unit tests)                     |

## Project structure

```
ajaia-docs/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Header, editor toolbar, dialogs, cards
│       ├── context/         # Active-user provider (simulated auth)
│       ├── hooks/           # useAutosave — debounced write-behind saving
│       ├── lib/             # API client, shared types, formatting
│       └── pages/           # Dashboard, Editor, Not found
├── server/                  # Express API
│   ├── prisma/              # Schema + seed script
│   └── src/
│       ├── lib/             # Access control, validation, TipTap + import helpers
│       ├── middleware/      # requireUser, error handling
│       ├── routes/          # /api/users, /api/documents
│       └── __tests__/       # Vitest suite
├── render.yaml              # Backend + database blueprint
└── vercel.json              # Frontend build config
```

---

## Getting started

**Requirements:** Node 18.18+ (Node 22 recommended) and npm 9+.

```bash
git clone <your-repo-url> ajaia-docs
cd ajaia-docs

npm install     # installs both workspaces
npm run setup   # creates server/.env, applies the schema, seeds demo data
npm run dev     # API on :4000, frontend on :5173
```

Open <http://localhost:5173>. `npm run setup` seeds three users — Ali Safdar, Sarah Johnson and
John Smith — plus a welcome document owned by Ali. Use the switcher in the top-right corner to see
the app as each of them, and try sharing a document from one user to another.

### Environment variables

`npm run setup` creates `server/.env` from `server/.env.example`; the defaults work as-is.

**`server/.env`**

| Variable       | Default                 | Notes                                                  |
| -------------- | ----------------------- | ------------------------------------------------------ |
| `DATABASE_URL` | `file:./dev.db`         | `file:` → SQLite, `postgres://` → PostgreSQL           |
| `PORT`         | `4000`                  | Port the API listens on                                |
| `CLIENT_URL`   | `http://localhost:5173` | Allowed CORS origin(s); comma-separate for several     |

**`client/.env`** (optional locally — copy from `client/.env.example`)

| Variable       | Default                     | Notes                            |
| -------------- | --------------------------- | -------------------------------- |
| `VITE_API_URL` | `http://localhost:4000/api` | Base API URL, including `/api`   |

The Prisma datasource provider is derived from `DATABASE_URL` automatically by
`server/scripts/prepare-prisma.mjs`, which runs before every dev/build/test command — so the same
schema works on SQLite locally and PostgreSQL in production with no manual edits.

### Scripts

Run from the repository root:

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Runs the API and the frontend together                     |
| `npm run build`     | Builds both workspaces                                     |
| `npm test`          | Runs the server test suite against a throwaway SQLite file |
| `npm run db:push`   | Applies the Prisma schema                                  |
| `npm run db:seed`   | Re-seeds demo users and the welcome document (idempotent)  |
| `npm run db:studio` | Opens Prisma Studio                                        |

---

## API

Every response uses one of two shapes:

```jsonc
{ "success": true,  "data": { /* ... */ } }
{ "success": false, "error": "Human readable message" }
```

Authentication is simulated: all `/api/documents` routes require an `x-user-id` header holding a
real user id. The middleware resolves that id against the database, so an unknown or malformed one
is rejected with a 401 before any handler runs.

| Method   | Endpoint                             | Who         | Description                              |
| -------- | ------------------------------------ | ----------- | ---------------------------------------- |
| `GET`    | `/api/health`                        | anyone      | Liveness probe                            |
| `GET`    | `/api/users`                         | anyone      | Seeded users, for the switcher and picker |
| `GET`    | `/api/documents`                     | any user    | `{ owned, shared }` with text previews    |
| `POST`   | `/api/documents`                     | any user    | Create an empty document                  |
| `POST`   | `/api/documents/import`              | any user    | Import `.txt` / `.md` content             |
| `GET`    | `/api/documents/:id`                 | owner/editor| Full document with content and shares     |
| `PATCH`  | `/api/documents/:id`                 | owner/editor| Update content; **owner only** to rename  |
| `DELETE` | `/api/documents/:id`                 | owner       | Delete the document and its shares        |
| `POST`   | `/api/documents/:id/share`           | owner       | Grant edit access to a user               |
| `DELETE` | `/api/documents/:id/share/:userId`   | owner       | Revoke a user's access                    |

Permission decisions live in one place — `server/src/lib/access.ts` — and every route goes through
it, so there is a single source of truth for who may do what.

## Testing

```bash
npm test
```

60 tests covering authentication, document CRUD, the owner/editor/no-access permission matrix,
sharing and revocation, Markdown-to-TipTap conversion, and preview generation. The suite builds a
disposable SQLite database (`server/prisma/test.db`) before it runs and deletes it afterwards, so
it never touches your development data.

---

## Deployment

The frontend and the API deploy separately: **Vercel** serves the static React build, **Render**
runs the Express API against a managed **PostgreSQL** database.

### 1. Push to GitHub

```bash
git init
git add -A
git commit -m "Ajaia Docs"
gh repo create ajaia-docs --private --source=. --push
```

### 2. Backend + database on Render

1. Render Dashboard → **New** → **Blueprint** → select the repository. `render.yaml` provisions
   the web service and a free PostgreSQL instance, wiring `DATABASE_URL` automatically.
2. After the first deploy, set **`CLIENT_URL`** on the service to your Vercel domain
   (for example `https://ajaia-docs.vercel.app`) so CORS lets the frontend through, then redeploy.
3. Note the service URL, for example `https://ajaia-docs-api.onrender.com`.

The start command applies the Prisma schema and seeds the demo users on boot — both idempotent —
so the database is usable as soon as the service is live. Free Render services sleep when idle, so
the first request after a pause can take ~30 seconds.

If you created the web service by hand instead of from the blueprint, use these settings:

| Setting        | Value                                              |
| -------------- | -------------------------------------------------- |
| Root Directory | *(leave blank — the repo root)*                    |
| Build Command  | `npm install --include=dev && npm run build --workspace server` |
| Start Command  | `npm run start:prod --workspace server`            |
| Health Check   | `/api/health`                                      |
| Env            | `DATABASE_URL`, `CLIENT_URL`, `NODE_VERSION=22`    |

> **Why the build tools are in `dependencies`.** Render sets `NODE_ENV=production`, which makes
> `npm install` skip `devDependencies`. Because the host compiles the TypeScript itself, `tsc`, the
> `@types/*` packages, the Prisma CLI and `tsx` are all needed there — so they are declared as real
> dependencies in `server/package.json`. Only the test-only packages (Vitest, Supertest) remain in
> `devDependencies`. Without this the build fails with `tsc: command not found` or a wall of
> `TS7016: Could not find a declaration file for module 'express'` errors.

<details>
<summary>Using Supabase for the database instead</summary>

Create a Supabase project, copy the **connection pooling** URI, and set it as `DATABASE_URL` on the
Render service (removing the `databases:` block from `render.yaml`):

```
postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true
```

No other change is needed — the Prisma provider switches to PostgreSQL from the URL alone.

</details>

### 3. Frontend on Vercel

1. Vercel → **Add New** → **Project** → import the repository. Either Root Directory setting works,
   because Vercel reads `vercel.json` from whichever directory you point it at and both are
   committed:

   | Root Directory | Config used | Build |
   | --- | --- | --- |
   | *blank* (repo root) | `vercel.json` | `npm run build --workspace client` → `client/dist` |
   | `client` | `client/vercel.json` | auto-detected Vite → `dist` |

   Both apply the SPA rewrite that makes `/documents/:id` deep links survive a refresh. Without it
   Vercel returns a 404 for any URL that is not the index — so if you change the Root Directory,
   make sure the matching `vercel.json` is the one being read.
2. Add an environment variable:

   | Name           | Value                                            |
   | -------------- | ------------------------------------------------ |
   | `VITE_API_URL` | `https://ajaia-docs-api.onrender.com/api`        |

3. Deploy, then go back and make sure Render's `CLIENT_URL` matches the Vercel domain.

The frontend can be deployed before the API exists — it will render a clear "Ajaia Docs could not
start" screen naming the URL it tried, and start working as soon as `VITE_API_URL` points at a live
API and the site is redeployed.

> `VITE_*` variables are inlined at build time, so changing `VITE_API_URL` requires a redeploy.

> The install step is scoped to the client workspace
> (`npm install --include=dev --workspace client --include-workspace-root`). The frontend build has
> no use for the server's dependencies, and pulling in the Prisma CLI would make Vercel download
> database engine binaries on every deploy.

---

## Design notes

- **One source of truth for permissions.** `getDocumentForUser` resolves a document *and* the
  caller's role in a single query; handlers ask it for permission rather than re-deriving rules.
- **Content is stored as JSON text.** SQLite has no JSON column type, so TipTap documents are
  serialised on write and parsed at the API boundary — the identical code path then works on
  PostgreSQL without a schema change. Corrupt content degrades to an empty document instead of
  breaking the editor.
- **Write-behind autosave.** `useAutosave` merges edits into one pending patch, keeps a single
  request in flight, sends anything typed mid-save immediately afterwards, and holds on to a failed
  payload so Retry can resend it.
- **Previews are computed server-side.** The dashboard receives flattened plain-text snippets
  rather than full documents, so listing many documents stays cheap.
- **Import is parsed on the server.** The browser only reads the file and posts its text; type,
  size and emptiness are validated on both sides.

## Possible next steps

Real authentication (sessions or OAuth), live multi-user presence via CRDTs (Yjs), per-share
read-only permissions, document search, and export back to Markdown or PDF.
