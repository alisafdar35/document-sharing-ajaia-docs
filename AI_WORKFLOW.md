# AI Workflow Note — Ajaia Docs

> **Before submitting:** the section marked **[CONFIRM]** covers work done outside the recorded
> session and needs a sentence from you. Everything else describes what actually happened and can
> be checked against the git history.

## Tools used

- **Claude Code (Claude Opus 5)** in the VS Code terminal — the main tool. Used for implementation,
  test authoring, and deployment debugging.
- **`gh` CLI** for repository creation and pushes.
- Render and Vercel dashboards for hosting; no AI involvement there beyond reading build logs.

## [CONFIRM] Work before the recorded session

The Express API, Prisma schema and seed script already existed when the recorded session began. Add
one line here on how that was produced — hand-written, AI-assisted, or a mix — since reviewers will
ask and only you know.

## Where AI materially sped things up

**The entire frontend.** `client/` contained only config files — no `src/` at all. Claude wrote
26 files in one pass: the dashboard, the TipTap editor page, the autosave hook, the share dialog,
the API client and the design system. It compiled clean on the first `tsc -b && vite build`. This
was the single largest time saving, on the order of a day.

**Test authoring.** 60 Vitest + Supertest tests covering the permission matrix, CRUD, validation
failures and Markdown conversion. Writing the *cases* is the slow part of testing, and enumerating
them from an existing API is something the model does well and quickly.

**Deployment debugging — the least expected win.** Both hosts failed, and in both cases the fix
came from *reproducing the failure locally* rather than reading logs and guessing:

- Render failed with `TS7016: Could not find a declaration file for module 'express'`. Cloning the
  repo and running `NODE_ENV=production npm install` reproduced it in under a minute: Render sets
  `NODE_ENV=production`, npm skips `devDependencies`, and the host compiles TypeScript itself — so
  `tsc` and the `@types/*` packages were simply absent. Fixed by declaring the build tools as real
  dependencies.
- That fix then broke **Vercel**, which began installing the Prisma CLI and its database engine
  binaries on a static frontend build. Fixed by scoping the install to the client workspace.

The second failure was caused by the first fix. Being able to simulate each host in a scratch
directory turned two rounds of dashboard guesswork into two verified changes.

## What I changed or rejected

**Rejected: the first Render fix.** Claude's initial approach was an `NPM_CONFIG_INCLUDE=dev`
environment variable in `render.yaml`. That only works if the service is created *from the
blueprint* — the service had been made by hand in the dashboard, so the variable was never applied.
Replaced with a repo-level change that works no matter how the service is configured.

**Rejected: a flaky test.** The first test helper seeded users with `Promise.all`, then asserted
their order. Three inserts can land in the same millisecond, so the ordering assertion was
non-deterministic — it failed on the first full run. Rather than delete the assertion, the helper
now sets explicit `createdAt` values, which keeps the test meaningful and makes it deterministic.

**Changed: a misleading error message.** The offline error hardcoded *"Is the API running on port
4000?"* — correct locally, nonsense on a deployed site where the real cause is an unset
`VITE_API_URL`. Now it names the URL it actually tried.

**Changed: production environment handling.** `prepare-prisma.mjs` created a `.env` containing a
SQLite URL whenever one was missing, including on a hosted server where `DATABASE_URL` already came
from the environment. Guarded so it only does that locally.

**Changed by hand: `server/tsconfig.json`** (commit `dc1b148`) — switched module resolution to
`NodeNext`.

**Rejected: scope creep.** Real-time collaboration, `.docx` import and a role system were all
declined as out of scope. Those tradeoffs are recorded in `ARCHITECTURE.md` rather than half-built.

## How correctness was verified

AI-written code was not trusted on the basis that it compiled.

1. **Automated tests** — 60 tests, all passing, focused on the permission matrix where a regression
   would otherwise be silent.
2. **End-to-end API exercise** — every call the client makes was run against the live API with
   `curl`: create → autosave patch → share → rejected rename by a shared editor → import → unshare
   → confirm the revoked user gets a 403 → delete. Verified against real responses, not assumed.
3. **Build verification of the real artifact** — the built frontend was served and checked, including
   that a deep link like `/documents/:id` resolves to the SPA shell.
4. **Host simulation** — clean clones installed with `NODE_ENV=production` to reproduce Render and
   Vercel conditions locally before pushing a fix.
5. **Reading the diff.** The flaky test, the misleading error message and the `.env` bug were all
   caught by review and verification, not by the code failing loudly.

## Honest assessment

AI removed most of the typing and nearly all of the boilerplate, and was genuinely good at
enumerating test cases and at the mechanical parts of debugging a deploy. What it did not remove
was the need to decide what to build, to notice a test that passes for the wrong reason, and to
insist on reproducing a failure before "fixing" it. The two deployment bugs are the clearest
example: both were plausible-looking configurations that only a real reproduction disproved.
