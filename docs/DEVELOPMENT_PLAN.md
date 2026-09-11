# DEVELOPMENT_PLAN.md — Tech Senture

Source of truth for **what** to build: `PRD.md`. Source of truth for **how** to build it: `ARCHITECTURE.md`. This file is the **order of operations**.

## Ground Rules (read before starting any module)

1. **Build exactly ONE module per session/run.** Never start the next module in the same run you finished the current one in, even if there's time/budget left — stop, update `PROGRESS.md`, and wait for the next instruction.
2. Before starting a module, re-read its entry here **and** the relevant PRD section(s) it references.
3. A module is only "done" when:
   - All its acceptance criteria are met.
   - It builds with no TypeScript errors and no console errors on the pages it touches.
   - The **Manual Test Checklist** for that module has been written out in the chat/response so a human can verify it by hand.
   - `PROGRESS.md` has been updated (see template — tick the module's checklist, fill in the "What was built" and "Known gaps" fields, bump the "Last updated" line).
4. If a module turns out to depend on something not yet built, stop and say so explicitly rather than silently building it out of order.
5. Never invent product behavior that isn't in `PRD.md`. If something is ambiguous, implement the most conservative reading, note it under "Known gaps" in `PROGRESS.md`, and flag it for the user to confirm.
6. Don't create `middleware.ts`. Use the proxy pattern in `ARCHITECTURE.md §2` for every module that needs auth/role/tenant checks.

---

## Phase 0 — Foundation

### Module 1: Project Bootstrap & Tooling
**Goal:** A running, empty Next.js app with all tooling wired up — nothing product-specific yet.
- Scaffold with `create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint).
- Set up pnpm, Prettier, strict `tsconfig.json`.
- Install and configure shadcn/ui.
- Set up Docker Compose for local Postgres.
- Create `.env.example` with the baseline vars from `ARCHITECTURE.md §7`.
- Create the `/docs` folder and place `PRD.md`, `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`, `PROGRESS.md` inside it.
- Create `PROGRESS.md` from the template in this repo (Module 0 row marked done once this module finishes).

**Manual Test Checklist:**
- [ ] `pnpm dev` starts with no errors, default Next.js page loads at `localhost:3000`.
- [ ] `pnpm build` completes with no type errors.
- [ ] `docker compose up` brings up Postgres; `psql`/Prisma can connect using `DATABASE_URL`.

---

### Module 2: Design System & Theming
**Goal:** The color tokens from `PRD.md §7.2` are wired into Tailwind and a base UI shell exists.
- Configure `tailwind.config.ts` with the 8 color tokens (`ARCHITECTURE.md §5`).
- Build a base app shell layout (sidebar + topbar placeholder, no real nav yet) using neutral shadcn components, styled with the tokens.
- Build a small internal `/dev/colors` page that renders all 8 swatches with labels — throwaway QA page, not part of the product.

**Manual Test Checklist:**
- [ ] Visit `/dev/colors` — all 8 swatches render with the correct hex values (compare visually against `PRD.md §7.2`).
- [ ] Resize the browser — base shell layout doesn't break at mobile/tablet widths.

---

### Module 3: Database Schema (Prisma)
**Goal:** Full `schema.prisma` matching `PRD.md §5`, migrated to local Postgres.
- Model every entity from the ERD summary: `Organization`, `AppSettings` (new, see `ARCHITECTURE.md §6`), `Project`, `Team`, `Membership`, `User`, `Task`, `Subtask`, `Label`, `Comment`, `Attachment`, `Session`, `Account`, `VerificationToken`.
- Model relationships and enums exactly as specified (`OrgRole`, `TeamRole`, `TaskStatus`, `TaskPriority`).
- Add the `position: Float` field on `Task` for board ordering (`PRD.md §4.4`).
- Run the first migration.
- Seed script with: 1 organization, 2 users, 1 project, 1 team, a handful of tasks in different statuses — used for manual testing in every later module.

**Manual Test Checklist:**
- [ ] `pnpm prisma migrate dev` runs clean.
- [ ] `pnpm prisma studio` shows all tables with correct columns/relations.
- [ ] Seed script populates data visible in Prisma Studio.

---

### Module 4: Authentication
**Goal:** Working sign up / login using Auth.js + Prisma adapter.
- Configure Auth.js with the Prisma adapter against the `User`/`Account`/`Session`/`VerificationToken` models.
- Credentials provider (email + password, hashed via bcrypt into `passwordHash`) at minimum; OAuth provider(s) optional/stubbed.
- Build `/login` and `/signup` pages matching the prototype copy in `PRD.md §7` ("Create your account", "Sign in to continue to your workspace").
- Session available in Server Components via `auth()` helper.

**Manual Test Checklist:**
- [ ] Sign up with a new email/password — redirected into the app.
- [ ] Log out, log back in with the same credentials — succeeds.
- [ ] Wrong password — clear error shown, no redirect.
- [ ] Visiting a protected route while logged out redirects to `/login`.

---

## Phase 1 — Organization & Project Hierarchy
*(maps to `PRD.md §8 Phase 1` and `§6.1–6.3`)*

### Module 5: Organization Model & Onboarding Flow
**Goal:** New users can create a workspace (2-step onboarding, `PRD.md §7`).
- Step 1: account creation (already covered by Module 4) → Step 2: "Create your workspace" (workspace name, team size) → creates an `Organization` and sets the creator as `ORG_OWNER`.
- "Step 2 of 2" progress indicator matches the prototype.
- Org profile edit page (`§6.1.1`).

**Manual Test Checklist:**
- [ ] Fresh sign-up is forced through onboarding before reaching the dashboard.
- [ ] Completing onboarding creates an org record; the signed-up user is `ORG_OWNER` (check Prisma Studio).
- [ ] Editing the org name from settings persists and reflects immediately in the UI.

### Module 6: Organization Roles & Member Invitations
**Goal:** `§6.1.2`, `§6.1.3`.
- Invite-by-email flow (creates a pending invite + sends email via Resend/dev transport).
- Accept-invite flow joins the org as `ORG_MEMBER` by default.
- Org member list with role management (promote/demote `ORG_ADMIN` ↔ `ORG_MEMBER`), restricted to `ORG_OWNER`/`ORG_ADMIN` via the proxy layer.

**Manual Test Checklist:**
- [ ] Invite a second email address — invite appears as "Pending" in the member list.
- [ ] Accept the invite (via link/dev-console-logged token) — new user appears as `ORG_MEMBER`.
- [ ] As `ORG_MEMBER`, attempting to change another member's role is blocked (UI hides it AND server action rejects it).

### Module 7: Projects
**Goal:** `§6.2` in full.
- Project CRUD, domain/category field, archive (not hard delete).
- Project list page + project detail page (progress overview placeholder — real aggregation comes after tasks exist, revisit in Module 10).

**Manual Test Checklist:**
- [ ] Create a project with a domain — appears in the project list.
- [ ] Archive it — disappears from the active list, still visible in an "Archived" filter/tab.
- [ ] As `ORG_MEMBER` (non-admin), project creation is not available (per role rules — confirm against Open Question in `PRD.md §10.2` if unresolved, default to admin-only).

### Module 8: Teams
**Goal:** `§6.3` in full.
- Team CRUD under a project, team member management via `Membership`.
- Team-level roles (`OWNER`/`MEMBER`); only `OWNER` can delete the team or remove members.

**Manual Test Checklist:**
- [ ] Create a team under an existing project.
- [ ] Add a second user to the team as `MEMBER`.
- [ ] As `MEMBER`, the "Delete team" action is not visible/blocked.
- [ ] As `OWNER`, deleting the team removes it and its memberships (tasks handled per Module 10 cascade rules).

### Module 9: Multi-Tenancy / Data Isolation Enforcement
**Goal:** Prove the isolation boundary from `PRD.md §4.1` actually holds, not just in theory.
- Audit every query added in Modules 5–8 to confirm it goes through `withOrgScope`/the org-scoped query layer.
- Add a second seed organization with its own project/team/users for cross-tenant testing.

**Manual Test Checklist:**
- [ ] Log in as a user in Org A. Attempt to access an Org B project/team URL directly (guess or copy the ID) — must 404/403, never leak data.
- [ ] Org-wide search (once built later) never returns Org B results while logged into Org A — flag this for re-testing in Module 20.

---

## Phase 2 — Task Core & Kanban Board
*(maps to `PRD.md §8 Phase 2`, `§6.4.1–6.4.2`, `§6.5.1–6.5.3`)*

### Module 10: Task Core (CRUD) + List View
**Goal:** `§6.5.1–6.5.3`, `§6.4.1`.
- Task CRUD scoped to a team; assignment via dropdown (selection-based, never drag-and-drop per `§4.4`).
- Priority (Low/Medium/High) using the Warning/Danger/Muted mapping from `PRD.md §7.2.1`.
- Due date field; overdue visually flagged in Danger color.
- List view: table with Task/Status/Priority/Assignee/Project columns, search box, empty state ("No tasks found — try a different search term").
- Wire the Project detail page's progress overview (deferred from Module 7) to real task counts now that tasks exist.

**Manual Test Checklist:**
- [ ] Create a task with all fields set — appears correctly in the list view.
- [ ] Set a due date in the past — task shows an "Overdue" badge in Danger color.
- [ ] Search for a task title that doesn't exist — empty state renders.
- [ ] Assign a task via the dropdown — assignee updates immediately.

### Module 11: Board (Kanban) View
**Goal:** `§6.4.2`, `§4.4` drag-and-drop rules.
- Columns: To Do / In Progress / Done.
- Drag a card to a different column → updates `status`.
- Drag within a column → updates `position` (float) for manual ordering.
- Empty-column state ("No tasks here").
- Confirm assignment is NOT possible via drag (only via the task detail dropdown).

**Manual Test Checklist:**
- [ ] Drag a task from To Do → In Progress — status persists after page refresh.
- [ ] Reorder two tasks within the same column — new order persists after refresh.
- [ ] Empty a column entirely — "No tasks here" renders.
- [ ] Confirm there is no drag target that changes assignee.

---

## Phase 3 — Richer Task Details
*(maps to `PRD.md §8 Phase 3`, `§6.5.4–6.5.11`)*

### Module 12: Subtasks, Labels & Tags
**Goal:** `§6.5.4`, `§6.5.5`.
- Subtask checklist inside task detail; task shows "N/M subtasks complete".
- Team-scoped, color-coded labels; many-to-many with tasks; label management UI at team level.

**Manual Test Checklist:**
- [ ] Add 3 subtasks, complete 1 — task detail shows "1/3".
- [ ] Create a new label with a color, attach it to two different tasks — both show the label badge in List and Board views.

### Module 13: Comments & @Mentions
**Goal:** `§6.5.6`, `§6.6.1`.
- Comment thread on task detail (timestamped, author, editable by author).
- `@mention` autocomplete against team members; mentioning triggers a notification (Module 19 wires the actual delivery — for now, log/store the notification record).

**Manual Test Checklist:**
- [ ] Post a comment — appears with correct author/timestamp.
- [ ] Edit your own comment — updates in place; edit option not shown on others' comments.
- [ ] Type `@` and a teammate's name — autocomplete suggests them; selecting creates a mention record (check DB).

### Module 14: File Attachments
**Goal:** `§6.5.7`.
- Upload files to a task via the configured storage provider (`ARCHITECTURE.md` §1/6).
- Store `fileName`, `fileUrl`, `fileSize`, `mimeType`; show attachments list on task detail with download links.

**Manual Test Checklist:**
- [ ] Upload a small file (e.g. a PNG) to a task — appears in the attachments list with correct name/size.
- [ ] Click the attachment — file downloads/opens correctly.
- [ ] Upload an oversized file (above the limit you set) — clear error shown, no partial record created.

### Module 15: Task Dependencies
**Goal:** `§6.5.8`.
- Mark Task A as depending on Task B.
- Soft warning (not hard block) shown if marking a dependent task "Done" while its predecessor is incomplete (per the conservative-default rule — flagged as an open question in `PRD.md §10.2`).

**Manual Test Checklist:**
- [ ] Set Task A to depend on Task B.
- [ ] Try marking Task A "Done" while Task B is still "To Do" — a warning is shown but the action is not blocked outright.
- [ ] Complete Task B first, then Task A — no warning appears.

### Module 16: Recurring Tasks
**Goal:** `§6.5.9`.
- Configure a recurrence rule (daily/weekly/monthly) on task creation.
- On completing an instance, a new instance is generated per the rule.

**Manual Test Checklist:**
- [ ] Create a daily recurring task, mark it Done — a new instance appears dated for the next day.
- [ ] Confirm the original completed instance stays in history/activity log, not silently deleted.

### Module 17: Time Tracking / Estimates
**Goal:** `§6.5.10`.
- Estimate field on task creation/edit; optional "actual time spent" log entries.

**Manual Test Checklist:**
- [ ] Set an estimate on a task — visible on task detail and in list view (optional column).
- [ ] Log actual time against a task — running total updates correctly.

### Module 18: Activity Log
**Goal:** `§6.5.11`.
- Read-only chronological log per task: actor, field changed, old → new value, timestamp.
- Wire it retroactively to status changes, reassignment, priority changes, and comments from earlier modules.

**Manual Test Checklist:**
- [ ] Change a task's status, priority, and assignee — all three show up as separate activity log entries with correct before/after values.
- [ ] Log entries are read-only (no edit/delete UI).

---

## Phase 4 — Additional Views
*(maps to `PRD.md §8 Phase 4`, `§6.4.3–6.4.4`)*

### Module 19: Calendar View
**Goal:** `§6.4.3`.
- Month grid; tasks plotted on their due date.
- Tasks with no due date excluded (but still visible in List/Board).

**Manual Test Checklist:**
- [ ] A task due this month appears on the correct day cell.
- [ ] A task with no due date does NOT appear on the calendar.
- [ ] Clicking a task on the calendar opens its detail view.

### Module 20: Timeline View
**Goal:** `§6.4.4`.
- Horizontal timeline; tasks with both start and end dates render as bars.
- Tasks missing one of the two dates are excluded or shown as a point marker (pick one, document the choice in `PROGRESS.md`).

**Manual Test Checklist:**
- [ ] A task with both start/end dates renders as a bar spanning the correct range.
- [ ] A task missing a start or end date is handled per the documented choice (not broken/crashing).

---

## Phase 5 — Collaboration & Notifications
*(maps to `PRD.md §8 Phase 5`, `§6.6.2`)*

### Module 21: Notifications
**Goal:** `§6.6.2`, plus wiring up everything Module 13/18 stored but didn't deliver.
- In-app notification center (bell icon + list).
- Email notifications for assignment, comments/mentions, and due dates.
- Settings → Notifications page: toggles for email notifications, task reminders, weekly digest (matches prototype copy in `PRD.md §7`).
- Login reminder surfacing overdue/upcoming tasks (`§6.5.3`).

**Manual Test Checklist:**
- [ ] Assign a task to another test user — they get an in-app notification and (if enabled) an email.
- [ ] Turn off "email notifications" in settings — subsequent events no longer send email, in-app notifications still appear.
- [ ] Log in with an overdue task assigned to you — reminder is visible on/near the dashboard.

---

## Phase 6 — Search, Filtering & Reporting
*(maps to `PRD.md §8 Phase 6`, `§6.7`, `§6.8`)*

### Module 22: Search & Filtering
**Goal:** `§6.7` in full.
- Combinable filters (team/assignee/status/priority) across List/Board/Calendar.
- Org-wide search across projects/teams/tasks, strictly scoped to the user's org (re-verify against Module 9's isolation tests).
- Saved/custom filter views (personal by default).

**Manual Test Checklist:**
- [ ] Apply two filters at once (e.g. status=In Progress + priority=High) — results match both conditions.
- [ ] Org-wide search for a term that only exists in another organization's data returns nothing.
- [ ] Save a filter combination, navigate away, come back — saved view is available and reapplies correctly.

### Module 23: Reporting & Analytics Dashboard
**Goal:** `§6.8` in full.
- Org dashboard: task status breakdown widget, overdue count widget (matches prototype's "Total Tasks"/"Overdue" elements).
- Per-team and per-member workload views, incorporating time estimates where available (Module 17), task counts otherwise.

**Manual Test Checklist:**
- [ ] Dashboard widget counts match what you can manually count in the seed/test data.
- [ ] Workload view correctly shows a member who is over-allocated (e.g. many High-priority tasks) as visually distinct from an under-allocated one.

---

## Phase 7 — Settings, Branding & Final Polish

### Module 24: Settings — Profile, Security, Admin Branding
**Goal:** Remaining screens from `PRD.md §7` plus the app-name requirement from `ARCHITECTURE.md §6`.
- Profile settings: full name, work email, change photo, save changes.
- Security settings: change password, two-factor authentication toggle ("add an extra layer of security").
- Admin settings (ORG_OWNER only): **Application Name** field, backed by the `AppSettings` table — changing it must update the app's displayed name everywhere (page title, sidebar/header logo text, email templates) without a code change or redeploy.

**Manual Test Checklist:**
- [ ] Update profile name/photo — reflects immediately across the app (e.g. comment author names).
- [ ] Change password — can log in with the new one, not the old one.
- [ ] Enable 2FA — subsequent login requires the second factor.
- [ ] As ORG_OWNER, change the Application Name in Admin settings — page `<title>`, header/logo text, and a test email all show the new name without redeploying.
- [ ] As ORG_MEMBER/ORG_ADMIN (non-owner), the Admin branding section is not accessible.

### Module 25: Empty States, Accessibility & Full Regression Pass
**Goal:** Close out `ARCHITECTURE.md §4` requirements and do a full pass across every module.
- Confirm every list/board/calendar/timeline has a proper empty state.
- Keyboard/menu-based fallback for board drag-and-drop (status change + reorder) per accessibility NFR in `PRD.md §9`.
- Full click-through regression using the Manual Test Checklists from Modules 1–24, re-run in one sitting.

**Manual Test Checklist:**
- [ ] Every view (List/Board/Calendar/Timeline, Notifications, Search) shows a sensible empty state with zero data.
- [ ] Complete a board status change and a reorder using only the keyboard (no mouse).
- [ ] Re-run the Manual Test Checklist of every prior module once, end to end, without hitting a broken flow.

---

## Deferred / Not Yet Scheduled

Per the Open Question in `PRD.md §10.2`, Recurring Tasks and Time Tracking were unplaced in the original roadmap — they've been placed at Modules 16–17 above as a reasonable default. Reconfirm this placement with the user if priorities shift.
