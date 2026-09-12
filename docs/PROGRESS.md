# PROGRESS.md — Tech Senture Build Progress

> **Instructions for the AI agent:** update this file immediately after finishing each module in `DEVELOPMENT_PLAN.md` — not before, not in the middle. Tick the module's checkbox, fill in "What was built" and "Known gaps / assumptions" in your own words, and update the "Last updated" line at the top. Never mark a module done if any of its Manual Test Checklist items are known to fail.

**Last updated:** September 11, 2026
**Current phase:** Phase 7 — Settings, Branding & Final Polish (Complete)
**Overall progress:** 25 / 25 modules complete (100%)

---

## Phase 0 — Foundation
- [x] **Module 1** — Project Bootstrap & Tooling
- [x] **Module 2** — Design System & Theming
- [x] **Module 3** — Database Schema (Prisma)
- [x] **Module 4** — Authentication

## Phase 1 — Organization & Project Hierarchy
- [x] **Module 5** — Organization Model & Onboarding Flow
- [x] **Module 6** — Organization Roles & Member Invitations
- [x] **Module 7** — Projects
- [x] **Module 8** — Teams
- [x] **Module 9** — Multi-Tenancy / Data Isolation Enforcement

## Phase 2 — Task Core & Kanban Board
- [x] **Module 10** — Task Core (CRUD) + List View
- [x] **Module 11** — Board (Kanban) View

## Phase 3 — Richer Task Details
- [x] **Module 12** — Subtasks, Labels & Tags
- [x] **Module 13** — Comments & @Mentions
- [x] **Module 14** — File Attachments
- [x] **Module 15** — Task Dependencies
- [x] **Module 16** — Recurring Tasks
- [x] **Module 17** — Time Tracking / Estimates
- [x] **Module 18** — Activity Log

## Phase 4 — Additional Views
- [x] **Module 19** — Calendar View
- [x] **Module 20** — Timeline View

## Phase 5 — Collaboration & Notifications
- [x] **Module 21** — Notifications

## Phase 6 — Search, Filtering & Reporting
- [x] **Module 22** — Search & Filtering
- [x] **Module 23** — Reporting & Analytics Dashboard

## Phase 7 — Settings, Branding & Final Polish
- [x] **Module 24** — Settings — Profile, Security, Admin Branding
- [x] **Module 25** — Empty States, Accessibility & Full Regression Pass

---

## Module Log

### Module 1 — Project Bootstrap & Tooling
- **Completed:** September 9, 2026
- **What was built:**
  - Initialized Next.js (latest stable 16.3.4, React 19) App Router project with TypeScript strict mode, ESLint, and Tailwind CSS.
  - Configured pnpm package manager, Prettier with Tailwind plugin (`.prettierrc`, `.prettierignore`, format scripts).
  - Initialized shadcn/ui base configuration (`components.json`, `components/ui/button.tsx`, `lib/utils.ts`).
  - Added `docker-compose.yml` for local PostgreSQL 16 Alpine database.
  - Created `.env.example` and `.env` with baseline environment variables from `ARCHITECTURE.md §7`.
- **Known gaps / assumptions:**
  - Docker Desktop daemon was not running during CLI check; `docker-compose.yml` syntax validated via `docker compose config`.
- **Manual test status:**
  - `pnpm dev` starts with no errors, HTTP 200 returned on `http://localhost:3000`.
  - `pnpm build` completes with 0 type/lint errors.
  - `docker-compose.yml` syntax validated via `docker compose config`.
- **Files touched:**
  - `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
  - `docker-compose.yml`, `.env.example`, `.env`
  - `components.json`, `components/ui/button.tsx`, `lib/utils.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

### Module 2 — Design System & Theming
- **Completed:** September 9, 2026
- **What was built:**
  - Configured the 8 design color tokens (Primary `#6366F1`, Secondary `#8B5CF6`, Background `#F8FAFC`, Text `#18181B`, Muted `#71717A`, Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`) in `app/globals.css` (CSS variables + `@theme inline`) and `tailwind.config.ts`.
  - Built responsive base app shell (`components/shared/app-shell.tsx`) featuring collapsible sidebar navigation with mobile drawer/backdrop, desktop topbar with search & notification placeholders, and main content canvas.
  - Created internal QA page `/dev/colors` rendering all 8 swatches with exact hex codes, CSS variables, and usage/mapping rules from PRD.md §7.2 / ARCHITECTURE.md §5.
  - Updated home page (`app/page.tsx`) to showcase base app shell and 4-level hierarchy structure cards.
- **Known gaps / assumptions:**
  - None. All 8 tokens match PRD.md §7.2 and ARCHITECTURE.md §5.
- **Manual test status:**
  - `/dev/colors` renders all 8 swatches with correct hex codes.
  - Base shell layout tested at desktop and mobile drawer breakpoints.
- **Files touched:**
  - `tailwind.config.ts`, `app/globals.css`
  - `components/shared/app-shell.tsx`
  - `app/dev/colors/page.tsx`
  - `app/page.tsx`

### Module 3 — Database Schema (Prisma)
- **Completed:** September 9, 2026
- **What was built:**
  - Modeled all entities from `PRD.md §5` and `ARCHITECTURE.md §6` in `prisma/schema.prisma`: `Organization`, `AppSettings` (admin configurable display name), `Project`, `Team`, `Membership`, `User`, `Task`, `Subtask`, `Label`, `Comment`, `Attachment`, `Account`, `Session`, `VerificationToken`.
  - Modeled all specified enums (`OrgRole`, `TeamRole`, `TaskStatus`, `TaskPriority`, `ProjectDomain`).
  - Added `position: Float` field to `Task` for Kanban board ordering per `PRD.md §4.4`.
  - Initialized singleton database client in `lib/db.ts`.
  - Created seed script in `prisma/seed.ts` populating 1 organization, 2 users (`ORG_OWNER`, `ORG_MEMBER`), 1 project, 1 team with roles & labels, and sample tasks across statuses (`DONE`, `IN_PROGRESS`, `TODO`).
  - Validated schema and generated Prisma Client with 0 errors.
- **Known gaps / assumptions:**
  - Local database server migration requires running database container or local Postgres password. Seed script and schema are verified against generated client.
- **Manual test status:**
  - `pnpm prisma validate` and `pnpm prisma generate` ran clean.
  - TypeScript compilation and Next.js build (`pnpm build`) pass with 0 errors.
- **Files touched:**
  - `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`, `package.json`

### Module 4 — Authentication
- **Completed:** September 9, 2026
- **What was built:**
  - Configured Auth.js / NextAuth v5 with Credentials provider and JWT session callbacks in `auth.ts`.
  - Built Zod validation schemas in `lib/validation/auth.ts` for login and signup.
  - Implemented the explicit proxy guard layer in `lib/api/proxy.ts` (`requireAuth`, `requireOrg`, `withAuth`, `withOrgScope`, `withRole`, `withTeamRole`) adhering strictly to the no-middleware rule (`ARCHITECTURE.md §2`).
  - Created Server Actions for authentication (`loginAction`, `signupAction`, `logoutAction`) in `app/(auth)/actions.ts`.
  - Built `/login` and `/signup` UI pages matching PRD.md §7 prototype specifications with validation and error alerts.
  - Built authenticated layout (`app/(app)/layout.tsx`) with server-side proxy gating and dashboard page with time-of-day greeting and task metrics.
- **Known gaps / assumptions:**
  - OAuth providers stubbed/ready for future external integrations; credentials provider with bcrypt password hashing active.
- **Manual test status:**
  - Sign up and sign in forms validated with Zod and bcrypt hashing.
  - Protected route `/dashboard` properly redirects unauthenticated visitors to `/login` (307) via server proxy guard.
  - `pnpm build` completes with 0 type errors and 0 lint warnings.
- **Files touched:**
  - `auth.ts`, `app/api/auth/[...nextauth]/route.ts`
  - `lib/api/proxy.ts`, `lib/validation/auth.ts`, `lib/data/app-settings.ts`
  - `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/actions.ts`
  - `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`, `components/shared/app-shell.tsx`, `app/page.tsx`

### Module 5 — Organization Model & Onboarding Flow
- **Completed:** September 9, 2026
- **What was built:**
  - Implemented Step 2 onboarding flow at `/onboarding` ("Create your workspace", workspace name, team size options, "Step 2 of 2" progress indicator matching prototype in PRD.md §7).
  - Created Server Action `createWorkspaceAction` that creates the `Organization` entity, generates a unique slug, and sets the creator as `ORG_OWNER`.
  - Implemented multi-tenancy enforcement redirect in `app/(app)/layout.tsx` which forces authenticated users without an organization to complete onboarding before accessing the dashboard or app shell.
  - Built Organization Settings page at `/settings/organization` with `OrgEditForm` and Server Action `updateOrganizationAction` guarded with `withRole(["ORG_OWNER", "ORG_ADMIN"])`.
  - Added organization data access layer in `lib/data/organization.ts` and Zod validation schemas in `lib/validation/organization.ts`.
  - Connected dynamic workspace name and role indicators to the application sidebar and profile settings page (`/settings/profile`).
- **Known gaps / assumptions:**
  - None. Onboarding and organization editing conform to PRD.md §6.1.1 and §7.
- **Manual test status:**
  - `/onboarding` renders with 2-step progress indicator and team size options.
  - `/settings/organization` renders workspace metadata and role-guarded editing form.
  - `pnpm build` completes with 0 type errors and 0 lint warnings.
- **Files touched:**
  - `lib/validation/organization.ts`, `lib/data/organization.ts`
  - `app/(auth)/onboarding/page.tsx`, `app/(auth)/onboarding/actions.ts`
  - `app/(app)/settings/organization/page.tsx`, `app/(app)/settings/organization/org-edit-form.tsx`, `app/(app)/settings/organization/actions.ts`
  - `app/(app)/settings/page.tsx`, `app/(app)/settings/profile/page.tsx`, `app/(app)/layout.tsx`, `components/shared/app-shell.tsx`

### Module 6 — Organization Roles & Member Invitations
- **Completed:** September 10, 2026
- **What was built:**
  - Added `Invitation` entity to `prisma/schema.prisma` with secure tokens and expiry.
  - Built email invitation delivery and development logging helper in `lib/email/invitation.ts`.
  - Created invite Server Action (`inviteMemberAction`) and invite revocation (`revokeInvitationAction`) restricted to `ORG_OWNER` and `ORG_ADMIN` via proxy layer.
  - Built invite acceptance and direct account registration flow at `/invite/[token]` with `InviteClient` and Server Actions (`acceptInvitationAction`, `signupWithInviteAction`).
  - Built full Member Management UI at `/settings/members` with active members table, role promotion/demotion dropdowns (`ORG_ADMIN` ↔ `ORG_MEMBER`), and pending invitations management.
  - Enforced strict role security checks: `ORG_MEMBER` cannot modify roles or invite members; only `ORG_OWNER` can modify `ORG_ADMIN` roles or transfer ownership; last owner cannot be demoted.
- **Known gaps / assumptions:**
  - Email transport logs invitations to terminal in dev mode; configured for Resend in production.
- **Manual test status:**
  - Invitation creation, pending list, and revocation verified.
  - Invite token resolution and registration flow `/invite/[token]` verified.
  - Role management permissions verified against proxy guards.
  - `pnpm build` completes with 0 type errors and 0 lint warnings.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/invitation.ts`, `lib/data/members.ts`, `lib/email/invitation.ts`
  - `app/(app)/settings/members/page.tsx`, `app/(app)/settings/members/members-client.tsx`, `app/(app)/settings/members/actions.ts`
  - `app/(auth)/invite/[token]/page.tsx`, `app/(auth)/invite/[token]/invite-client.tsx`, `app/(auth)/invite/[token]/actions.ts`
  - `components/shared/app-shell.tsx`, `app/(app)/settings/organization/page.tsx`

### Module 7 — Projects
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented Project CRUD operations with Server Actions (`createProjectAction`, `updateProjectAction`, `toggleArchiveProjectAction`, `deleteProjectAction`) in `app/(app)/projects/actions.ts`, protected via proxy layer role guards (`withRole(["ORG_OWNER", "ORG_ADMIN"])`).
  - Added project validation schemas (`createProjectSchema`, `updateProjectSchema`, `toggleArchiveProjectSchema`, `deleteProjectSchema`) in `lib/validation/project.ts` with mandatory `domain` categorization (Development, Sales, Marketing, Operations, Other).
  - Built project data access layer in `lib/data/projects.ts` with multi-tenancy `organizationId` scoping.
  - Built responsive Project List page at `/projects` with active/archived tabs, domain category chips, search filtering, empty states, and project creation modal.
  - Built Project Detail page at `/projects/[projectId]` with domain badges, description, breadcrumbs, edit/archive modal, assigned teams list, and aggregated progress overview statistics (PRD.md §6.2.4).
- **Known gaps / assumptions:**
  - Per Open Question in PRD §10.2, project creation and archiving are restricted to ORG_OWNER / ORG_ADMIN.
- **Manual test status:**
  - Project creation with domain and description verified.
  - Active vs Archived tabs and domain filtering verified.
  - Project detail page with assigned teams and progress overview verified.
  - `pnpm build` completes with 0 type errors and 0 lint warnings.
### Module 8 — Teams
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented Team CRUD under parent projects with Server Actions (`createTeamAction`, `updateTeamAction`, `deleteTeamAction`) in `app/(app)/teams/actions.ts` using `withOrgScope` and role verification.
  - Team creation assigns the creator as Team `OWNER` within a database transaction.
  - Built team member management actions (`addTeamMemberAction`, `updateTeamMemberRoleAction`, `removeTeamMemberAction`) linking Users and Teams via `Membership` records with `OWNER` / `MEMBER` roles.
  - Enforced strict team-level permissions: team deletion and member removal restricted to Team `OWNER` or `ORG_OWNER`; last `OWNER` cannot be demoted or removed without prior transfer.
  - Built responsive Teams list page at `/teams` with parent project filtering, search, member badges, task counters, empty states, and team creation modal.
  - Built Team Detail page at `/teams/[teamId]` with parent project breadcrumb badge, metric widgets, full member management table (with role promotion/demotion and remove actions), and task placeholder area.
  - Linked team cards in Project Detail page (`/projects/[projectId]`) directly to corresponding team detail pages.
- **Known gaps / assumptions:**
  - Deleting a team cascades and removes team memberships and labels per Prisma schema.
- **Manual test status:**
  - Team creation under a parent project verified with creator as `OWNER`.
  - Adding members, role toggles (`OWNER` ↔ `MEMBER`), and removal safeguards verified.
  - `npm run build` passes with 0 type errors, 0 lint warnings, and clean static/dynamic route generation.
### Module 9 — Multi-Tenancy / Data Isolation Enforcement
- **Completed:** September 10, 2026
- **What was built:**
  - Audited all queries across `lib/data/` (`organization.ts`, `members.ts`, `projects.ts`, `teams.ts`) and Server Actions (`projects/actions.ts`, `teams/actions.ts`, `settings/members/actions.ts`, `settings/organization/actions.ts`) to ensure strict adherence to the proxy isolation contract (`ARCHITECTURE.md §2`).
  - Verified that all queries derive `organizationId` from authenticated server sessions via `withOrgScope` and `withRole`, never accepting `organizationId` from client input.
  - Updated `prisma/seed.ts` to provision two isolated organizations: Tenant A (`Acme Corp`, slug `acme-corp`) and Tenant B (`Globex Corporation`, slug `globex-corp`) each with their own owners, members, projects, and teams.
  - Created automated test suite in `scripts/test-multi-tenancy.ts` covering 7 critical isolation boundaries: project list isolation, direct project ID access prevention (404/null guard), team list isolation, direct team ID access prevention, member list isolation, team member selector scoping, and tenant metadata scoping.
- **Known gaps / assumptions:**
  - Search and reporting multi-tenancy boundaries will be re-tested in Module 22.
### Module 10 — Task Core (CRUD) + List View
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented Task CRUD Server Actions (`createTaskAction`, `updateTaskAction`, `updateTaskStatusAction`, `updateTaskAssigneeAction`, `deleteTaskAction`) in `app/(app)/tasks/actions.ts` with org-scoping via `withOrgScope` and role verification.
  - Added task validation schemas in `lib/validation/task.ts` (`createTaskSchema`, `updateTaskSchema`, `updateTaskStatusSchema`, `updateTaskAssigneeSchema`, `deleteTaskSchema`).
  - Created task data layer in `lib/data/tasks.ts` (`getOrgTasks`, `getTaskById`, `getOrgTeamsWithMembers`) with combinable filtering across team, project, status, priority, assignee, and search keywords.
  - Built responsive Task List View at `/tasks/list` (with redirect from `/tasks`) featuring view switcher (List, Board, Calendar), search-as-you-type, combinable filter chips (Status, Priority, Team, Assignee), instant inline status and assignee dropdowns, overdue badges in Danger color (`#EF4444`), priority tokens per PRD.md §7.2.1, and modals for Task creation and editing.
  - Updated Project Detail page (`/projects/[projectId]`) and `lib/data/projects.ts` to aggregate real task metrics (Overall Progress bar, completion percentage, Done/In-Progress breakdown, and Overdue count).
  - Updated main sidebar navigation in `components/shared/app-shell.tsx` to link to `/tasks/list`.
- **Known gaps / assumptions:**
  - Board drag-and-drop and in-column ordering will be implemented in Module 11.
- **Manual test status:**
  - Task creation with all fields (priority, status, due date, team, assignee) verified.
  - Overdue badge in Danger color renders properly for past-due tasks.
  - Filter and search combinations render correct results and empty state ("No tasks found — try a different search term").
  - Inline dropdown assignee selection updates immediately.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `lib/validation/task.ts`, `lib/data/tasks.ts`, `lib/data/projects.ts`
  - `app/(app)/tasks/actions.ts`, `app/(app)/tasks/page.tsx`
  - `app/(app)/tasks/list/page.tsx`, `app/(app)/tasks/list/task-list-client.tsx`
### Module 11 — Board (Kanban) View
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented interactive Kanban Board view at `/tasks/board` with `@dnd-kit/core` and `@dnd-kit/sortable`.
  - Configured 3 workflow columns: `To Do` (`TODO`), `In Progress` (`IN_PROGRESS`), and `Done` (`DONE`).
  - Added drag-and-drop card movement across columns which automatically updates the task's `status` field in the database.
  - Added in-column drag-and-drop reordering with persistent floating-point `position` calculation (midpoint calculation between adjacent tasks).
  - Added empty-column states ("No tasks here" with quick "+ Add a task" action) for all columns per PRD.md §6.4.2 & §7.1.
  - Implemented `updateTaskPositionAndStatusAction` Server Action with org-scoping and Zod validation in `app/(app)/tasks/actions.ts`.
  - Built smooth optimistic UI updates with animated drag overlays, search filtering, priority filtering, team filtering, and inline edit/delete modals.
- **Known gaps / assumptions:**
  - Dragging a task onto an avatar to reassign is explicitly prohibited per PRD §4.4 (selection-based only).
- **Manual test status:**
  - Dragging card across columns updates status in database and UI.
  - Reordering within columns calculates new float position and persists on reload.
  - Empty columns show clear "No tasks here" state.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `lib/validation/task.ts`, `app/(app)/tasks/actions.ts`
  - `app/(app)/tasks/board/page.tsx`, `app/(app)/tasks/board/board-client.tsx`

### Module 12 — Subtasks, Labels & Tags
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented Subtask checklist within rich Task Detail Modal (`components/tasks/task-detail-modal.tsx`) with optimistic checkbox completion toggle, dynamic progress bar, completion percentage, and real-time subtask addition/deletion.
  - Created Subtask validation schemas (`lib/validation/subtask.ts`) and Server Actions (`createSubtaskAction`, `toggleSubtaskAction`, `deleteSubtaskAction`) in `app/(app)/tasks/actions.ts` scoped via proxy layer `withOrgScope`.
  - Implemented team-scoped color-coded Labels & Tags (`lib/validation/label.ts`) with many-to-many relationship to tasks.
  - Created Label Server Actions (`createLabelAction`, `deleteLabelAction`, `toggleTaskLabelAction`) in `app/(app)/tasks/actions.ts`.
  - Built Team-level Label Management UI on the Team Detail page (`app/(app)/teams/[teamId]/team-detail-client.tsx`) allowing team members to view, create, and delete color-coded tags.
  - Wired Task Detail Modal into both List view (`app/(app)/tasks/list/task-list-client.tsx`) and Kanban Board view (`app/(app)/tasks/board/board-client.tsx`), showing interactive label chips and subtask progress indicators (`N/M subtasks`) on rows and cards.
- **Known gaps / assumptions:**
  - Comments and attachments will be added to the task detail modal in Modules 13 and 14.
- **Manual test status:**
  - Add 3 subtasks, complete 1 — task detail shows "1/3 completed (33%)" and progress bar.
  - Create a new label with a color token and attach it to tasks — both show the color badge in List and Board views.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `lib/validation/subtask.ts`, `lib/validation/label.ts`, `lib/data/tasks.ts`, `lib/data/teams.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`
  - `app/(app)/teams/[teamId]/team-detail-client.tsx`

### Module 13 — Comments & @Mentions
- **Completed:** September 10, 2026
- **What was built:**
  - Built comment validation schemas in `lib/validation/comment.ts` (`createCommentSchema`, `updateCommentSchema`, `deleteCommentSchema`).
  - Added `Notification` entity and `NotificationType` enum to `prisma/schema.prisma` with `@prisma/client` updated.
  - Implemented Server Actions in `app/(app)/tasks/actions.ts` (`createCommentAction`, `updateCommentAction`, `deleteCommentAction`) guarded with `withOrgScope` and role verification.
  - Added interactive Comments & Discussion thread in `components/tasks/task-detail-modal.tsx` with author avatars, timestamps, edited indicators, and in-place editing for comment authors.
  - Implemented `@mention` autocomplete system in comment textarea: typing `@` pops up team member autocomplete suggestions; selecting a member inserts `@MemberName` and records `Notification` records in the database with server console logging.
  - Formatted comment rendering with highlighted `@mention` chips.
  - Passed `currentUser` context from List and Board clients to `TaskDetailModal` for author-scoped action permissions.
- **Known gaps / assumptions:**
  - In-app notification bell and notification center UI will be wired in Module 21.
- **Manual test status:**
  - Post a comment — appears with correct author and timestamp.
  - Edit your own comment — updates in place; edit option not shown on others' comments.
  - Type @ and a teammate's name — autocomplete suggests them; selecting creates a mention notification record in DB.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/comment.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`

### Module 14 — File Attachments
- **Completed:** September 10, 2026
- **What was built:**
  - Implemented modular storage provider system in `lib/storage/index.ts` with `LocalStorageProvider` supporting configurable storage backend (saving collision-safe files to `public/uploads/` with sanitized names, switchable to S3/Uploadthing per `ARCHITECTURE.md §1/6`).
  - Set a 25MB max file upload size limit (`MAX_FILE_SIZE = 25 * 1024 * 1024` bytes).
  - Created attachment validation schemas in `lib/validation/attachment.ts` (`uploadAttachmentSchema`, `deleteAttachmentSchema`).
  - Added Server Actions in `app/(app)/tasks/actions.ts` (`uploadAttachmentAction`, `deleteAttachmentAction`) guarded with `withOrgScope` and role/uploader verification.
  - Built interactive File Attachments section in Task Detail Modal (`components/tasks/task-detail-modal.tsx`) with dynamic mime-type icons (images, PDFs, spreadsheets, archives, text documents, code files), human-readable file sizes, clickable download links, file delete actions, and instant upload indicator.
- **Known gaps / assumptions:**
  - Local disk storage provider used for development and local deployments; cloud storage adapter (S3 / Cloudflare R2) can be plugged into `StorageProvider` interface for production multi-server setups.
- **Manual test status:**
  - Upload a small file (e.g. a PNG) to a task — appears in the attachments list with correct name/size.
  - Click the attachment — file downloads/opens correctly.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `lib/storage/index.ts`, `lib/validation/attachment.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`

### Module 15 — Task Dependencies
- **Completed:** September 10, 2026
- **What was built:**
  - Added `TaskDependency` model to `prisma/schema.prisma` linking `dependentTask` (successor) and `dependsOnTask` (predecessor / blocker) with composite unique constraint.
  - Implemented circular dependency graph cycle detection (`checkHasCycle`) using BFS traversal preventing infinite loops.
  - Added dependency validation schemas in `lib/validation/dependency.ts` (`addDependencySchema`, `removeDependencySchema`) guarding against self-dependency and cross-task anomalies.
  - Added Server Actions in `app/(app)/tasks/actions.ts` (`addDependencyAction`, `removeDependencyAction`) scoped via proxy layer `withOrgScope`.
  - Implemented Soft Warning enforcement per `PRD.md §6.5.8` / Open Question #2: when changing a task's status to `DONE` (via Task Detail modal, List view dropdown, or Board Kanban drag-and-drop), the system alerts the user if predecessor tasks remain incomplete, but permits completion without hard blocking.
  - Built interactive Task Dependencies UI in `components/tasks/task-detail-modal.tsx` with Prerequisites list, status badges, incomplete warning indicators, downstream dependent tasks ("Blocks"), and task selector form.
  - Added dependency counter chips on rows in Task List View (`/tasks/list`) and cards in Kanban Board View (`/tasks/board`).
- **Known gaps / assumptions:**
  - Soft warning model implemented per conservative default (confirmed in Open Questions).
- **Manual test status:**
  - Set Task A to depend on Task B.
  - Try marking Task A "Done" while Task B is still "To Do" — warning is shown and the action proceeds without being blocked outright.
  - Complete Task B first, then Task A — no warning appears.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/dependency.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`

### Module 16 — Recurring Tasks
- **Completed:** September 10, 2026
- **What was built:**
  - Added `RecurrenceRule` enum (`NONE`, `DAILY`, `WEEKLY`, `MONTHLY`) and `recurrence`, `parentId`, `parentTask`, `childTasks` relations to `Task` in `prisma/schema.prisma`.
  - Created recurrence calculation and instance generation logic in `lib/tasks/recurrence.ts` (`calculateNextDueDate`, `generateNextRecurringTaskInstance`).
  - Added `recurrence` to Zod task validation schemas (`lib/validation/task.ts`).
  - Wired automated next instance cloning into `app/(app)/tasks/actions.ts` across `updateTaskStatusAction`, `updateTaskPositionAndStatusAction`, and `updateTaskAction` whenever a recurring task transitions to `DONE`.
  - The completed recurring task remains preserved in task history/activity while spawning a fresh `TODO` instance with the next calculated due date (`+1 day`, `+7 days`, or `+1 month`), cloned subtasks, and connected labels.
  - Integrated recurrence selector dropdowns in Create/Edit Task modals (List & Board views) and added recurrence indicator chips on List rows, Board Kanban cards, and the Task Detail modal metadata grid.
- **Known gaps / assumptions:**
  - Recurrence rules support `DAILY`, `WEEKLY`, and `MONTHLY` intervals per PRD §6.5.9.
- **Manual test status:**
  - Create a daily recurring task, mark it Done — a new instance appears dated for the next day.
  - Confirm the original completed instance stays in history/activity log, not silently deleted.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/task.ts`, `lib/tasks/recurrence.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`

### Module 17 — Time Tracking / Estimates
- **Completed:** September 10, 2026
- **What was built:**
  - Added `estimatedHours: Float?` to the `Task` model and created the `TimeEntry` model with `durationMinutes`, `note`, `loggedAt`, and relations to `Task` and `User` in `prisma/schema.prisma`.
  - Added Zod schemas for time entry validation in `lib/validation/time-entry.ts` (`createTimeEntrySchema`, `deleteTimeEntrySchema`) and added `estimatedHours` to `createTaskSchema` and `updateTaskSchema` in `lib/validation/task.ts`.
  - Added Server Actions in `app/(app)/tasks/actions.ts`: `createTimeEntryAction` and `deleteTimeEntryAction` with tenancy proxy enforcement (`withOrgScope`) and author/admin authorization checks.
  - Included `timeEntries` and `estimatedHours` in task data queries in `lib/data/tasks.ts` (`getOrgTasks`, `getTaskById`).
  - Added Estimate (Hours) input to Create/Edit Task modals across List View (`/tasks/list`) and Kanban Board View (`/tasks/board`).
  - Added Time column to Task List table and Time indicator chip to Kanban board cards displaying running logged time and estimate (e.g. `2.5h / 4h`).
  - Built interactive Time Tracking & Estimates section in Task Detail Modal (`components/tasks/task-detail-modal.tsx`) with dynamic estimate progress bar, over-estimate warning highlight, "+ Log Time" inline form (hours, minutes, note), and chronological work log feed with delete action.
- **Known gaps / assumptions:**
  - Estimates and actuals roll up to workload views in Phase 6 (Reporting & Analytics).
- **Manual test status:**
  - Set an estimate on a task — visible on task detail and in list view (dedicated Time column).
  - Log actual time against a task — running total and progress bar update correctly with optimistic responsiveness.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/time-entry.ts`, `lib/validation/task.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`

### Module 18 — Activity Log
- **Completed:** September 10, 2026
- **What was built:**
  - Added `TaskActivity` model to `prisma/schema.prisma` linking `Task` and `User` (actor) with `action`, `field`, `oldValue`, `newValue`, and `createdAt` fields.
  - Created `recordTaskActivity` utility helper in `lib/tasks/activity.ts` for consistent audit trail generation.
  - Implemented automatic activity logging across all task lifecycle Server Actions in `app/(app)/tasks/actions.ts` (`TASK_CREATED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNEE_CHANGED`, `TITLE_CHANGED`, `ESTIMATE_CHANGED`, `COMMENT_ADDED`, `ATTACHMENT_ADDED`, `DEPENDENCY_ADDED`, `TIME_LOGGED`).
  - Updated task data queries in `lib/data/tasks.ts` to include `activities` alongside actor information.
  - Built interactive, append-only **Activity Log** section in `components/tasks/task-detail-modal.tsx` rendering user avatar badges, clear human-readable change summaries with formatted before/after values, and timestamps.
  - Enforced strict immutability for activity log entries (read-only audit trail with zero edit or delete capability per `PRD.md §6.5.11`).
- **Known gaps / assumptions:**
  - None. Audit entries are recorded synchronously within task mutations.
- **Manual test status:**
  - Change a task's status, priority, and assignee — all three show up as separate activity log entries with correct before/after values.
  - Log entries are read-only (no edit/delete UI).
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/tasks/activity.ts`, `lib/data/tasks.ts`
  - `app/(app)/tasks/actions.ts`, `components/tasks/task-detail-modal.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`

### Module 19 — Calendar View
- **Completed:** September 11, 2026
- **What was built:**
  - Created `/tasks/calendar` route (`app/(app)/tasks/calendar/page.tsx` and `app/(app)/tasks/calendar/calendar-client.tsx`) implementing full monthly calendar view per `PRD.md §6.4.3`.
  - Built 7-column month calendar grid with previous/next month navigation, Jump to Today, and leading/trailing days padding.
  - Plotted scheduled tasks onto their respective due date cells with priority indicators, status styling, assignee badges, subtask indicators, and overdue highlighting.
  - Filtered out tasks without a due date from the calendar grid cells per PRD acceptance criteria, providing an Unscheduled Tasks modal/drawer for quick access without cluttering the monthly grid.
  - Connected Task Detail Modal (`TaskDetailModal`) allowing users to click any scheduled task on the calendar to open full subtasks, comments, file attachments, dependencies, time entries, and immutable activity logs.
  - Added quick day-cell "+ Add Task" action pre-filling task creation with that day's due date, plus comprehensive search, team, status, priority, and assignee filters.
- **Known gaps / assumptions:**
  - None. Calendar view supports full editing, creation, deletion, and detail inspection.
- **Manual test status:**
  - A task due this month appears on the correct day cell.
  - A task with no due date does NOT appear on the calendar grid.
  - Clicking a task on the calendar opens its detail view modal.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `app/(app)/tasks/calendar/page.tsx`, `app/(app)/tasks/calendar/calendar-client.tsx`
  - `docs/PROGRESS.md`

### Module 20 — Timeline View
- **Completed:** September 11, 2026
- **What was built:**
  - Added `startDate DateTime?` field to `Task` model in `prisma/schema.prisma`, synced database, and generated Prisma Client.
  - Updated task validation schemas (`lib/validation/task.ts`) and Server Actions (`app/(app)/tasks/actions.ts`) to handle and persist `startDate` across task lifecycle operations.
  - Built `/tasks/timeline` route (`app/(app)/tasks/timeline/page.tsx` and `app/(app)/tasks/timeline/timeline-client.tsx`) implementing horizontal Gantt/roadmap timeline view per `PRD.md §6.4.4`.
  - Implemented configurable Zoom scales (Days, Weeks, Months), horizontal pan/shift controls, and "Jump to Today" alignment.
  - Rendered tasks with both `startDate` and `dueDate` as horizontal duration bars spanning their exact date range with status colors, priority stripes, and assignee indicators.
  - Documented design choice for single-date tasks: tasks with only one date (`dueDate` only or `startDate` only) render as milestone point markers at that date; tasks missing both dates are cleanly listed in the "Unscheduled Tasks" drawer without breaking the timeline grid.
  - Connected `TaskDetailModal` for full task detail inspection and updated view switcher tabs across List, Board, Calendar, and Timeline views.
- **Known gaps / assumptions:**
  - Single-date tasks render as milestone point markers per the documented design choice.
- **Manual test status:**
  - A task with both start/end dates renders as a bar spanning the correct range.
  - A task missing a start or end date is handled as a milestone point marker or in the unscheduled drawer (not broken/crashing).
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/task.ts`, `app/(app)/tasks/actions.ts`
  - `app/(app)/tasks/timeline/page.tsx`, `app/(app)/tasks/timeline/timeline-client.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/board/board-client.tsx`, `app/(app)/tasks/calendar/calendar-client.tsx`
  - `docs/PROGRESS.md`

### Module 21 — Notifications
- **Completed:** September 11, 2026
- **What was built:**
  - Added notification preferences (`notifyEmail`, `notifyTaskReminders`, `notifyWeeklyDigest`) to `User` model in `prisma/schema.prisma` and updated Prisma Client.
  - Created email notification dispatcher in `lib/email/notification.ts` (with development terminal logging and Resend integration readiness).
  - Built system notification dispatcher in `lib/notifications/dispatcher.ts` that respects recipient user preferences across in-app records and email alerts.
  - Built Server Actions in `app/(app)/notifications/actions.ts` (`getNotificationsAction`, `markNotificationAsReadAction`, `markAllNotificationsAsReadAction`, `deleteNotificationAction`, `updateNotificationPreferencesAction`).
  - Wired notification triggers across task lifecycle actions (`app/(app)/tasks/actions.ts`):
    - `ASSIGNMENT` notifications on task creation and assignee updates.
    - `MENTION` notifications to @mentioned team members in comments.
    - `COMMENT` notifications to task assignees.
  - Built interactive topbar **Notification Center** (`components/notifications/notification-center.tsx`) in `components/shared/app-shell.tsx` with dynamic unread badge count, dropdown item list, mark read/delete actions, and navigation links.
  - Built **Settings → Notifications** page (`app/(app)/settings/notifications/page.tsx` and `notifications-settings-client.tsx`) with category toggles (Email Notifications, Task Reminders, Weekly Digest) matching PRD prototype.
  - Built **Dashboard Login Task Reminder Banner** (`app/(app)/dashboard/page.tsx`) alerting users to overdue tasks and upcoming deadlines assigned to them upon login (`PRD §6.5.3`).
- **Known gaps / assumptions:**
  - None. In-app notifications, email dispatching, user settings, and login reminders are fully functional.
- **Manual test status:**
  - Assign a task to another test user — they get an in-app notification and email dispatch log.
  - Turn off "email notifications" in settings — subsequent events no longer trigger email, in-app notifications still appear.
  - Log in with an overdue task assigned to you — reminder banner is visible on the dashboard with direct action links.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/email/notification.ts`, `lib/notifications/dispatcher.ts`, `app/(app)/notifications/actions.ts`
  - `app/(app)/tasks/actions.ts`, `components/notifications/notification-center.tsx`, `components/shared/app-shell.tsx`
  - `app/(app)/settings/notifications/page.tsx`, `app/(app)/settings/notifications/notifications-settings-client.tsx`
### Module 22 — Search & Filtering
- **Completed:** September 11, 2026
- **What was built:**
  - Added `SavedView` model to `prisma/schema.prisma` linking `User` and `Organization` with `name` and `filters` (JSON), synced database, and generated Prisma Client.
  - Implemented multi-entity organization-scoped global search data layer in `lib/data/search.ts` (`searchOrganization`) querying Tasks (title, description), Projects (name, description), and Teams (name, description) with strict multi-tenant isolation.
  - Created Server Action `globalSearchAction` in `app/(app)/search/actions.ts` guarded via proxy layer `withOrgScope`.
  - Built interactive modal dialog `GlobalSearchDialog` (`components/search/global-search-dialog.tsx`) with instant debounced live search, category tabs (All, Tasks, Projects, Teams), domain/status/priority badges, keyboard navigation (ESC, Enter), and global keyboard shortcut (`Cmd+K` / `Ctrl+K`) listener.
  - Activated search bar trigger across desktop topbar and mobile header in `components/shared/app-shell.tsx`.
  - Created Personal Saved Views system (`lib/data/saved-views.ts` and `app/(app)/tasks/saved-views/actions.ts`) with `getSavedViewsAction`, `createSavedViewAction`, and `deleteSavedViewAction`.
  - Built reusable `SavedViewsBar` component (`components/tasks/saved-views-bar.tsx`) allowing users to save their current active filter combination with a custom name, quickly switch between saved views, and delete views.
  - Integrated `SavedViewsBar` and URL query parameter synchronization (`useSearchParams`) across all 4 task views (List, Board, Calendar, Timeline) wrapped with Suspense boundaries.
- **Known gaps / assumptions:**
  - Saved views are personal per user + organization in v1 per PRD §6.7.3 and Open Question #4.
- **Manual test status:**
  - Apply two filters at once (e.g. status=In Progress + priority=High) — results match both conditions.
  - Org-wide search for a term that only exists in another organization's data returns nothing (strictly scoped to user's organizationId).
  - Save a filter combination, navigate away, come back — saved view is available and reapplies correctly.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/data/search.ts`, `lib/data/saved-views.ts`, `app/(app)/search/actions.ts`, `app/(app)/tasks/saved-views/actions.ts`
  - `components/search/global-search-dialog.tsx`, `components/tasks/saved-views-bar.tsx`, `components/shared/app-shell.tsx`
  - `app/(app)/tasks/list/task-list-client.tsx`, `app/(app)/tasks/list/page.tsx`
  - `app/(app)/tasks/board/board-client.tsx`, `app/(app)/tasks/board/page.tsx`
  - `app/(app)/tasks/calendar/calendar-client.tsx`, `app/(app)/tasks/calendar/page.tsx`
  - `app/(app)/tasks/timeline/timeline-client.tsx`, `app/(app)/tasks/timeline/page.tsx`
  - `docs/PROGRESS.md`

### Module 23 — Reporting & Analytics Dashboard
- **Completed:** September 11, 2026
- **What was built:**
  - Implemented comprehensive analytics data calculation layer in `lib/data/analytics.ts` (`getOrgAnalytics`) aggregating task status distribution (Total, To Do, In Progress, Done, completion rate), overdue counts with high-priority breakdown, priority distributions, and time tracking / estimates rollup.
  - Built per-member workload calculations (`MemberWorkloadData`) incorporating time estimates (from Module 17) where available and active task counts otherwise.
  - Added intelligent capacity status categorization (`OVER_ALLOCATED`, `BALANCED`, `UNDER_ALLOCATED`) with visual capacity progress bars and distinct danger/success/muted badges.
  - Built per-team workload metrics (`TeamWorkloadData`) detailing task volume per team, active vs done progress, tasks-per-member ratios, estimated hours vs logged hours, and direct links to team workspaces.
  - Built interactive, responsive `DashboardClient` component (`components/dashboard/dashboard-client.tsx`) with three tab views: **Overview** (status widgets, priority breakdown, time tracking effort progress, active projects, login reminder banner), **Member Workload** (over/balanced/under allocated filter cards, member cards with active tasks snippet), and **Team Workload** (team capacity distribution cards).
  - Updated `/dashboard` page (`app/(app)/dashboard/page.tsx`) to serve real-time org analytics and workload data.
- **Known gaps / assumptions:**
  - Workload calculations dynamically incorporate estimated hours and priority weights with 40h weekly baseline.
- **Manual test status:**
  - Dashboard widget counts match what you can manually count in the seed/test data.
  - Workload view correctly shows a member who is over-allocated (e.g. many High-priority tasks or > 30h estimates) as visually distinct with red border and Over-Allocated badge from a balanced or under-allocated one.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `lib/data/analytics.ts`, `components/dashboard/dashboard-client.tsx`, `app/(app)/dashboard/page.tsx`, `docs/PROGRESS.md`

### Module 24 — Settings — Profile, Security, Admin Branding
- **Completed:** September 11, 2026
- **What was built:**
  - Added `twoFactorEnabled Boolean @default(false)` to `User` model in `prisma/schema.prisma`, synced database, and generated Prisma client.
  - Implemented **Profile Settings** (`app/(app)/settings/profile/page.tsx` and `profile-client.tsx`) with full name input, work email editing, photo/avatar preset picker and removal, and Server Action `updateProfileAction` with instant layout cache revalidation.
  - Implemented **Security Settings** (`app/(app)/settings/security/page.tsx` and `security-client.tsx`) with change password form (verifying current password with bcrypt, hashing new password) and Two-Factor Authentication (2FA) toggle card ("Two-factor authentication — add an extra layer of security") with Server Actions (`changePasswordAction`, `toggleTwoFactorAction`).
  - Implemented **Admin Application Branding** (`app/(app)/settings/organization/admin-branding-form.tsx` and `app/(app)/settings/organization/page.tsx`) backed by `AppSettings` table (`ARCHITECTURE.md §6`).
  - Enforced strict authorization: Admin Branding is visible and executable ONLY by `ORG_OWNER` via proxy guard `withRole(["ORG_OWNER"])`. Changing the application name immediately updates the brand name across the page titles, sidebar, topbar, mobile header, and emails without redeploying.
  - Built comprehensive **Settings Directory Hub** (`app/(app)/settings/page.tsx`) connecting Profile, Security, Organization & Admin Branding, Members, and Notifications.
- **Known gaps / assumptions:**
  - Admin application branding is strictly restricted to ORG_OWNER per specification.
- **Manual test status:**
  - Update profile name/photo — reflects immediately across the app.
  - Change password — validates current password and updates hash.
  - Enable 2FA — toggles status badge to Enabled and persists state.
  - As ORG_OWNER, change Application Name in Admin settings — dynamic branding updates immediately.
  - As ORG_MEMBER / ORG_ADMIN (non-owner), the Admin branding section is not rendered and cannot be updated.
  - `npm run build` succeeds with 0 type errors, 0 lint warnings, and clean route generation.
- **Files touched:**
  - `prisma/schema.prisma`, `lib/validation/profile.ts`, `lib/validation/security.ts`, `lib/validation/branding.ts`
  - `app/(app)/settings/profile/page.tsx`, `app/(app)/settings/profile/profile-client.tsx`, `app/(app)/settings/profile/actions.ts`
  - `app/(app)/settings/security/page.tsx`, `app/(app)/settings/security/security-client.tsx`, `app/(app)/settings/security/actions.ts`
  - `app/(app)/settings/organization/page.tsx`, `app/(app)/settings/organization/admin-branding-form.tsx`, `app/(app)/settings/organization/actions.ts`
  - `app/(app)/settings/page.tsx`, `docs/PROGRESS.md`

### Module 25 — Empty States, Accessibility & Full Regression Pass
- **Completed:** September 11, 2026
- **What was built:**
  - **Comprehensive Empty States Audit:** Verified that every view across the application (List, Board columns, Calendar, Timeline, Notifications Center, Global Search Dialog, Projects, Teams, and Members) renders informative, brand-consistent empty state graphics, guidance copy, and direct creation/action buttons when zero data is present.
  - **Full Keyboard Accessibility:**
    - Integrated accessible keyboard navigation and explicit status select menu fallback (`handleMoveTask`) on `SortableTaskCard` in the Kanban Board (`app/(app)/tasks/board/board-client.tsx`), enabling keyboard-only users to shift task statuses between columns (To Do, In Progress, Done) and reorder within columns (Move Up / Down) without requiring mouse drag-and-drop.
    - Verified `GlobalSearchDialog` keyboard shortcut (`Cmd+K` / `Ctrl+K`), `Esc` dismissals, tab-indexes, and ARIA labels across modals and interactive elements.
  - **Full Regression Pass:** Ran Next.js production build (`npm run build`) compiling all 24 static and dynamic routes with zero TypeScript errors and zero lint warnings.
- **Known gaps / assumptions:**
  - None. All 25 modules across Phases 0 through 7 are complete and verified.
- **Manual test status:**
  - Every view (List/Board/Calendar/Timeline, Notifications, Search) shows a sensible empty state with zero data.
  - Complete a board status change and a reorder using only the keyboard (no mouse).
  - Re-run the Manual Test Checklist of every prior module once, end to end, without hitting a broken flow.
  - Next.js production build passes with 0 errors across all routes.
- **Files touched:**
  - `app/(app)/tasks/board/board-client.tsx`
  - `docs/PROGRESS.md`

---

## Open Questions Carried From PRD.md §10.2

Track answers here once the user confirms them, so later modules don't have to re-derive them:

1. Should `ORG_ADMIN` be able to delete an entire Project, or is that restricted to `ORG_OWNER` only? — **Status:** unresolved (Module 7 currently defaults to admin-only for creation; deletion permission TBD).
2. Enforcement behavior for task dependencies — hard block or soft warning? — **Status:** resolved as soft warning per PRD §6.5.8 (warning shown if predecessor is incomplete, action not blocked outright).
3. Which phase should Recurring Tasks and Time Tracking be delivered in? — **Status:** resolved as Modules 16–17 (see `DEVELOPMENT_PLAN.md` "Deferred / Not Yet Scheduled").
4. Are saved filter views shareable with a team, or strictly personal in v1? — **Status:** resolved as personal-only in v1 per PRD §6.7.3 (stored per user and organization via SavedView model).
5. What are the file size/type limits for Attachments, and where are files stored? — **Status:** resolved as 25MB max size per file, stored via modular `StorageProvider` (`LocalStorageProvider` in `public/uploads/`).




