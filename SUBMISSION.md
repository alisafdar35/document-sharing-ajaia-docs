# Submission — Ajaia Docs

**Ajaia Docs** is a lightweight collaborative document editor: create rich-text documents, import
`.txt`/`.md` files, share them with a teammate, and edit together. Built for the brief's scenario —
an internal productivity tool for teams working on shared documents — with depth in a few areas
rather than shallow coverage of everything Google Docs does.

> **Fill in before sending:** the two links marked **[PENDING]** below, and delete this line.

## Links

| What | Where |
| --- | --- |
| Live product | **[PENDING — deployment in progress]** |
| Source code | https://github.com/alisafdar35/ajaia-docs *(private — invite reviewers, or use the copy in this folder)* |
| Walkthrough video | **[PENDING]** — also in `VIDEO_URL.txt` |

## What is in this folder

| File | Contents |
| --- | --- |
| `README.md` | Feature overview, local setup, API reference, deployment steps |
| `ARCHITECTURE.md` | Architecture note: what I prioritized, the tradeoff table, testing strategy |
| `AI_WORKFLOW.md` | Which AI tools I used, what I changed or rejected, how I verified correctness |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Walkthrough video link |
| `client/` | React + TypeScript + Vite frontend (TipTap editor) |
| `server/` | Express + Prisma API, including the test suite |

## Test accounts

No login to get through — authentication is simulated, as the brief allows. The app opens as a
seeded user, and the **switcher in the top-right corner** changes who you are. That is how to
review the sharing flow.

| Name | Email | Starts with |
| --- | --- | --- |
| Ali Safdar | ali@example.com | The "Welcome to Ajaia Docs" document |
| Sarah Johnson | sarah@example.com | Nothing |
| John Smith | john@example.com | Nothing |

**To see sharing end to end:** open a document as Ali → **Share** → add Sarah → switch to Sarah via
the top-right menu → the document is under **Shared with me** → open it and edit; the title field is
read-only because she is not the owner. Switch back to Ali and remove her access, and it disappears.

## Running locally

Requires Node 18.18+ (22 recommended).

```bash
npm install
npm run setup   # creates server/.env, applies the schema, seeds the three users
npm run dev     # API on :4000, frontend on :5173
```

Open <http://localhost:5173>. Tests: `npm test` (60 tests).

## What works end to end

- **Documents** — create, rename (owner only), edit, delete; content and title persist across
  refresh and reopen.
- **Rich text** — bold, italic, underline, strikethrough, inline code, H1–H3, bulleted and numbered
  lists, blockquotes, code blocks, horizontal rules, undo/redo.
- **Autosave** — debounced, one request in flight, honest status indicator, Retry on failure, and a
  warning if you close the tab with unsaved work.
- **Import** — `.txt` and `.md` up to 1 MB become a new editable document; Markdown structure
  (headings, lists, quotes, code fences, inline marks) is converted into real editor content.
  Supported types are stated next to the Import button.
- **Sharing** — the owner grants and revokes editor access; the dashboard separates **My documents**
  from **Shared with me**; permissions are enforced on the server, not just hidden in the UI.
- **Persistence** — Prisma, SQLite locally and PostgreSQL when deployed, from one schema.
- **Tests** — 60 Vitest + Supertest tests, all passing.

## What is incomplete

- **Deployment.** The frontend and API are configured and both build cleanly from a clean clone
  (`vercel.json`, `render.yaml` are committed), but the hosted URL is not live yet. Two host-specific
  build failures were found and fixed; see `AI_WORKFLOW.md`. **This is the one deliverable not
  finished.** Running locally takes about two minutes and exercises every feature.
- **No real authentication.** User identity is an `x-user-id` header against seeded accounts. The
  brief permits this; it is not secure and is not meant to be.
- **No concurrent editing.** Two people in the same document at the same time will overwrite each
  other — last write wins. There is no presence indicator.
- **One permission level.** Sharing grants `editor`. There is no read-only role, though the column
  exists and the API returns it.
- **`.docx` is not supported**, only `.txt` and `.md` — stated in the UI and the README.
- **The client is one 516 kB JS chunk**, not code-split.

## What I would build next, given 2–4 more hours

1. **Finish the deployment** and confirm the full flow against the hosted URL — the only thing
   standing between this and a complete submission.
2. **Presence indicators** — "Sarah is viewing this document", via polling. Most of the perceived
   value of collaboration for a fraction of the cost of CRDTs.
3. **A read-only share role** — a schema default plus a check in `getDocumentForUser`, and hiding
   the toolbar for viewers. Small, and the most commonly asked-for sharing feature.
4. **Export to Markdown** — the inverse of the importer, which already proves the mapping works.

Beyond that: real sessions, then Yjs for genuine concurrent editing, then version history.

## Scope decisions, briefly

I spent the time on **permissions**, **autosave** and **the import parser**, because those are where
a document tool is actually judged: losing someone's work or leaking a private document are the
failures that matter, and both are enforced server-side and covered by tests. I deliberately did not
build real-time collaboration, `.docx` support, real auth, or a role system — each is a large piece
of work that would have left everything else shallower. The reasoning is in `ARCHITECTURE.md`.
