# TechSentry — Build Docs

This folder is a self-contained doc set for building the product with an AI IDE / OpenCode agent. Put it in your repo under `docs/` (paths referenced across these files assume that location).

| File | Purpose |
|---|---|
| **START_PROMPT.md** | Copy-paste this into your AI IDE / OpenCode agent as the very first message. It points the agent at the other three files and sets the ground rules (one module per run, no `middleware.ts`, update `PROGRESS.md` every time, etc.). |
| **PRD.md** | The full product requirements — *what* to build. Converted from the original PRD Word document, including the ERD summary and color design system. |
| **ARCHITECTURE.md** | The technical contract — *how* to build it. Next.js (latest) + TypeScript + Tailwind + Prisma/Postgres + Auth.js, the proxy-instead-of-middleware pattern, folder structure, and the configurable app-name requirement. |
| **DEVELOPMENT_PLAN.md** | The module-by-module build order (25 modules across 7 phases), each with acceptance criteria and a manual test checklist. |
| **PROGRESS.md** | Living tracker. Starts empty. The agent updates it after every completed module — this is how you'll know what's built and how to test it. |

## How to use this

1. Create a new project folder, put these 5 files in `docs/`.
2. Open your AI IDE / OpenCode in that folder.
3. Paste the contents of `START_PROMPT.md` as your first message.
4. The agent builds **Module 1**, then stops and gives you a manual test checklist.
5. You test it by hand using that checklist.
6. If it passes, tell the agent to continue to the next module. If not, describe what broke — the agent should fix it before moving on.
7. Repeat until `PROGRESS.md` shows all 25 modules complete.
