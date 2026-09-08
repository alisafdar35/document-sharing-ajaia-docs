# Architecture Note — Ajaia Docs

A short account of how the app is put together, what I chose to go deep on, and what I
deliberately left out.

## Shape of the system

```
Browser (React + TipTap)
      │  fetch, x-user-id header
      ▼
Express API  ──►  Prisma  ──►  SQLite (local) / PostgreSQL (deployed)
```

Three pieces, one repository, npm workspaces holding them together:

- **`client/`** — Vite + React 18 + TypeScript, Tailwind for styling, TipTap (ProseMirror) for the
  editor, React Router for two real screens (dashboard, editor).
- **`server/`** — Express 4 + TypeScript. Zod validates every request body. Prisma is the only
  thing that talks to the database.
- **`prisma/schema.prisma`** — three tables: `User`, `Document`, `DocumentShare`.

## Where I chose to go deep

**1. Permissions have exactly one implementation.**
Every document route calls `getDocumentForUser(documentId, userId)`, which returns the document
*and* the caller's role in a single query, or throws 403/404. Handlers never re-derive the rules:

| Role                  | Read | Edit content | Rename | Share | Delete |
| --------------------- | ---- | ------------ | ------ | ----- | ------ |
| Owner                 | ✅   | ✅           | ✅     | ✅    | ✅     |
| Shared editor         | ✅   | ✅           | ❌     | ❌    | ❌     |
| Everyone else         | ❌   | ❌           | ❌     | ❌    | ❌     |

The client hides what you cannot do, but the server is what enforces it — the UI is a convenience,
never the control. This matrix is the most heavily tested part of the codebase.

**2. Autosave that behaves under stress.**
Saving is where a document editor either feels solid or loses your work. `useAutosave` is a
write-behind buffer: edits merge into one pending patch, a save fires once typing pauses (800 ms),
and only one request is ever in flight. Anything typed *during* a save is sent immediately after it
lands. A failed save keeps its payload so the status bar's Retry resends it, and `beforeunload`
warns if you close the tab with work still buffered. The indicator reports real state — unsaved,
saving, saved, error — rather than optimistically claiming success.

**3. Document content as portable JSON.**
TipTap produces a ProseMirror JSON document. SQLite has no JSON column type, so content is stored
as a JSON string and parsed at the API boundary. That one decision means the identical code path
runs on PostgreSQL in production with no schema change, and `prepare-prisma.mjs` flips the Prisma
provider based on the `DATABASE_URL` scheme so nobody has to remember to edit the schema. Corrupt
content degrades to an empty document instead of breaking the editor.

## Tradeoffs I made on purpose

| Decision | Why | What it costs |
| --- | --- | --- |
| **Simulated auth** (`x-user-id` header, seeded users) | The brief permits seeded accounts. Real auth is a day of work that demonstrates nothing about document editing. | Not remotely secure; any id grants that identity. The middleware still resolves the id against the database, so the shape is right for dropping in real sessions. |
| **Autosave, not real-time collaboration** | Concurrent editing means CRDTs and a websocket layer — the single biggest way to blow the scope. | Two people editing at once will overwrite each other; last write wins. |
| **`.txt` / `.md` only, no `.docx`** | Markdown covers the interesting part (structure survives the import) with a parser I can test. `.docx` is a zip of XML and a dependency. | Stated in the UI next to the Import button and in the README. |
| **One permission level (`editor`)** | The brief asks for access, not a role system. The column exists and is returned by the API. | Adding a read-only role is a schema default and a couple of checks. |
| **Import parsed on the server** | Keeps one implementation, and the browser cannot be trusted about file contents anyway. | Sends file text through JSON rather than multipart. Type, size and emptiness are checked on both sides. |
| **Previews computed server-side** | The dashboard needs a snippet, not a full ProseMirror tree. | Listing many documents stays cheap; the list endpoint never ships content. |

## Error handling and validation

Every response is `{ success: true, data }` or `{ success: false, error }`, so the client has one
shape to handle. Errors converge on a single Express handler that maps `AppError` (with its HTTP
status), `ZodError` (400, first message), and Prisma's `P2002`/`P2025` (409/404) into that
envelope; anything unrecognised logs server-side and returns a generic 500 rather than leaking a
stack trace. On the client, `ApiError` carries the status, so the editor can render "you do not
have access" or "document not found" as a real page instead of a toast, and the offline case names
the URL it actually tried.

## Testing

60 Vitest + Supertest tests, chosen for the parts where a regression would be silent rather than
for coverage percentage:

- the full owner / editor / no-access matrix, including that a shared editor **cannot** rename,
  delete or re-share, and that revoking access takes effect immediately;
- document CRUD, including validation failures and corrupt stored content;
- Markdown → TipTap conversion (headings, lists, quotes, code fences, inline marks) and the
  `.txt` path that must *not* interpret Markdown;
- the auth middleware rejecting missing, blank and unknown user ids.

The suite builds a disposable SQLite database before it runs and deletes it after, so it never
touches development data.

## What I would do next

In rough priority order: real authentication with sessions; presence indicators, then Yjs for
genuine concurrent editing; a read-only share role; document version history; export back to
Markdown or PDF; and code-splitting the client bundle, which is currently a single 516 kB chunk.
