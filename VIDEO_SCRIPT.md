# Walkthrough Script — Ajaia Docs (3–5 min)

**Live app:** https://ajaia-docs-client-rho.vercel.app
**Users:** Ali Safdar · Sarah Johnson · John Smith — switch from the top-right menu, no password.

> ### Before you hit record
>
> 1. **Wake the API.** Open https://ajaia-docs-dngb.onrender.com/api/health and wait for the JSON
>    response. Render's free tier sleeps after ~15 minutes idle, and a cold start takes 30–60
>    seconds — long enough to look broken on camera.
> 2. **Have a file ready** to import — a small `.txt` or `.md`. A few Markdown headings and a bullet
>    list demo best, because the structure survives the import.
> 3. **Start as Ali Safdar** (the switcher persists your last user).
> 4. Close other tabs and set the browser to ~100% zoom.

---

### 0:00–0:20 — Intro

> "Hi, this is my Ajaia Docs submission. I built a lightweight full-stack collaborative document
> editor focused on the core Google Docs-style workflow within the assignment timebox."

### 0:20–1:10 — Create and edit

Open the live URL, click **New document**.

> "I'll start by creating a new document. The editor supports basic rich-text formatting including
> bold, italic, underline, headings, bullet lists, and numbered lists."

Give it a title, type a paragraph, then apply **bold**, *italic*, a **heading**, and a **bullet
list** from the toolbar.

> "Changes are autosaved, so I don't need a manual save action."

*Point at the "All changes saved" indicator next to the title as you say this.*

### 1:10–1:35 — Persistence

Refresh the browser.

> "After refreshing, the document and its formatting are still available, demonstrating backend
> persistence rather than temporary browser state."

### 1:35–2:00 — File import

Back to the document list. Click **Import** and pick your `.txt` or `.md` file.

> "The product also supports importing text and Markdown files into the document workflow. The
> imported file becomes a normal editable document."

*The supported formats are stated under the buttons — worth pointing out, since it shows the limit
is surfaced in the UI, not just the README.*

### 2:00–2:50 — Sharing

Open a document you own → **Share** → add **Sarah Johnson**.

> "Each document has an owner. The owner can grant another seeded user access to the document."

Switch the active user to **Sarah Johnson** via the top-right menu.

> "After switching users, the shared document appears under Shared With Me. This lets reviewers test
> the sharing flow without needing to create multiple accounts."

Open the shared document and make a small edit.

### 2:50–3:20 — Ownership and access control

> "Shared users can edit document content, but ownership-sensitive operations such as sharing,
> renaming, or deleting remain restricted to the owner. Access control is also enforced on the
> backend, not only hidden in the frontend."

*As Sarah, the title is plain text rather than an editable field, and there is no Share or Delete
button — a good visual beat for this line.*

### 3:20–3:50 — Architecture

Show the GitHub repo or `README.md`.

> "The frontend is built with React, Vite, TypeScript, Tailwind, and TipTap. The backend uses
> Node.js, Express, TypeScript, Prisma, and persistent database storage. The frontend is deployed on
> Vercel and the API is deployed on Render."

*If you want one more beat: `npm test` shows 60 passing tests, most of them covering exactly the
permission rules described a moment ago.*

### 3:50–4:15 — Scope decisions

> "Given the timebox, I deliberately prioritized a complete workflow: create, edit, autosave,
> persist, import, share, and reopen."
>
> "I intentionally deprioritized real-time multiplayer editing, CRDTs, comments, revision history,
> and advanced role-based permissions."

### 4:15–4:45 — AI workflow

> "I used AI tools to accelerate scaffolding, debugging, repetitive implementation work, test
> generation, and documentation refinement."
>
> "I reviewed the generated output manually and changed or rejected suggestions that introduced
> unnecessary complexity, incorrect assumptions, or deployment issues."
>
> "I verified the result through manual end-to-end testing, automated tests, persistence checks,
> sharing tests, and production deployment validation."

*A concrete example lands better than the general claim, if you have a spare beat: the deployment
fix — the build failed on Render because the host compiles TypeScript but `NODE_ENV=production`
skips `devDependencies`; reproducing it locally rather than guessing from the dashboard is what
found it.*

### 4:45–5:00 — Close

> "That's the core Ajaia Docs workflow. The live product and source code are included with the
> submission. Thank you for reviewing my work."
