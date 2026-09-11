# ARCHITECTURE.md — TechSentry (working name)

> This file is a **binding technical contract**. Every module in `DEVELOPMENT_PLAN.md` must follow these rules unless a module explicitly overrides one and explains why. If anything here conflicts with `PRD.md`, functional behavior (what the product does) comes from `PRD.md`; technical implementation (how it's built) comes from this file.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (latest stable)**, App Router | Use `create-next-app@latest` at project bootstrap so we always get the current version — do not pin to a version you remember from training data, check what actually installs. |
| Language | TypeScript (strict mode) | `"strict": true` in `tsconfig.json`. No `any` unless justified with a comment. |
| Styling | Tailwind CSS (latest) | Theme tokens configured from the color palette in `PRD.md §7.2` — see §5 below. |
| UI Components | shadcn/ui (Radix-based) | Installed per-component as needed, not as a monolithic dependency. |
| ORM | Prisma | Schema modeled directly from `PRD.md §5 Data Model (ERD Summary)`. |
| Database | PostgreSQL | Local dev via Docker Compose; works unchanged on any managed Postgres in production. |
| Auth | Auth.js (NextAuth v5) with Prisma Adapter | The ERD's `User`, `Account`, `Session`, `VerificationToken` entities are the **exact** standard Auth.js Prisma schema — this is not a coincidence, build on it directly instead of a custom auth system. |
| Server state / data fetching | Server Components + Server Actions first; TanStack Query only where client-side caching/optimistic updates are genuinely needed (e.g. board drag-and-drop). |
| Client state | Zustand for local/UI state (e.g. open modals, active filters) — no Redux. |
| Drag & drop | `dnd-kit` for the Board view. |
| Forms & validation | `react-hook-form` + `zod`. Zod schemas are shared between client validation and server action input validation (single source of truth per entity). |
| Email | Resend (or `nodemailer` in dev) for invites, notifications, and digests. |
| File storage | Uploadthing (or S3-compatible bucket) for Attachments — abstracted behind a `lib/storage` interface so the provider can be swapped without touching feature code. |
| Package manager | pnpm | Faster installs, strict dependency resolution. |

Do not introduce a library outside this table without flagging it first — keep the dependency surface small and intentional.

---

## 2. Hard Rule: No Next.js `middleware.ts` — Use a Proxy Pattern Instead

**Do not create `middleware.ts` at all.** All cross-cutting concerns that would normally live in middleware — auth gating, organization/tenant scoping, role checks, rate limiting — must instead go through an explicit **proxy layer** of wrapper functions that every Server Action / Route Handler calls into on purpose. Nothing runs implicitly on every request.

### 2.1 Why
- Full visibility: every protected action visibly opts into the checks it needs — nothing is "invisible magic" running before the page even loads.
- No edge-runtime constraints (full Node APIs available — needed for Prisma, file uploads, etc.).
- Per-route control over exactly which checks apply, in what order, instead of one global filter.

### 2.2 The pattern

Create a proxy module at `lib/api/proxy.ts` that exports composable guards:

```ts
// lib/api/proxy.ts
export async function withAuth<T>(fn: (ctx: { user: User }) => Promise<T>): Promise<T> { ... }

export async function withOrgScope<T>(
  fn: (ctx: { user: User; organizationId: string }) => Promise<T>
): Promise<T> { ... }

export async function withRole<T>(
  roles: OrgRole[],
  fn: (ctx: { user: User; organizationId: string }) => Promise<T>
): Promise<T> { ... }

export async function withTeamRole<T>(
  teamId: string,
  roles: TeamRole[],
  fn: (ctx: { user: User; teamId: string }) => Promise<T>
): Promise<T> { ... }
```

Every Server Action and Route Handler wraps its body in the relevant guard(s), e.g.:

```ts
// app/(app)/projects/actions.ts
"use server";
export async function createProject(input: CreateProjectInput) {
  return withRole(["ORG_OWNER", "ORG_ADMIN"], async ({ organizationId }) => {
    const data = createProjectSchema.parse(input);
    return db.project.create({ data: { ...data, organizationId } });
  });
}
```

### 2.3 Multi-tenancy enforcement (critical)

Organization data isolation (`PRD.md §4.1`) must be enforced **inside the proxy/data-access layer**, never trusted from client input alone:
- `withOrgScope` resolves `organizationId` from the authenticated session — it is **never** accepted as a raw parameter from the client for scoping purposes.
- Every Prisma query that touches org-scoped data must include `organizationId: ctx.organizationId` in its `where` clause. Prefer a thin repository/query layer (`lib/data/*.ts`) that bakes this in, so a route handler literally cannot forget it.
- Module 9 (Data Isolation Enforcement) in `DEVELOPMENT_PLAN.md` is dedicated to testing this boundary — do not skip it.

---

## 3. Folder Structure

```
/app
  /(marketing)/               # public/landing pages (optional, minimal)
  /(auth)/
    /login/
    /signup/
    /onboarding/               # 2-step workspace creation flow
  /(app)/                      # authenticated app shell
    /dashboard/
    /projects/
      /[projectId]/
    /teams/
      /[teamId]/
    /tasks/
      /list/
      /board/
      /calendar/
      /timeline/
    /settings/
      /profile/
      /security/
      /notifications/
      /admin/                  # app-name / branding settings (see Module 24)
  /api/
    /auth/[...nextauth]/
    /uploadthing/
/components
  /ui/                         # shadcn primitives
  /shared/                     # cross-feature composites (empty states, etc.)
/lib
  /api/proxy.ts                # the guard/proxy layer described in §2
  /data/                       # query layer, one file per entity
  /validation/                 # zod schemas, one file per entity
  /email/
  /storage/
/prisma
  schema.prisma
  /migrations
/docs                          # THIS set of .md files lives here
  PRD.md
  ARCHITECTURE.md
  DEVELOPMENT_PLAN.md
  PROGRESS.md
```

---

## 4. Coding Conventions

- **Server Components by default.** Add `"use client"` only where interactivity requires it (forms, drag-and-drop, dropdowns with local state).
- **Server Actions** for all mutations (create/update/delete). Route Handlers (`/api/*`) only for things Server Actions can't do (webhooks, file upload endpoints, NextAuth).
- **One Zod schema per entity**, reused for form validation and server-side input validation.
- **No `any`.** No unchecked `as` casts on data coming from the database or user input.
- Every list/board/calendar view must implement an **empty state** (per `PRD.md §7.1`) — this is not optional polish, it's part of the module's definition of done.
- Every destructive action (delete team/project/task) requires a confirmation step in the UI.

---

## 5. Design Tokens

Implement the palette from `PRD.md §7.2` as Tailwind theme extensions (`tailwind.config.ts`) **and** CSS variables, so the same tokens work in both Tailwind classes and any raw CSS/inline style:

| Token | Hex | Tailwind var suggestion |
|---|---|---|
| Primary | `#6366F1` | `--color-primary` |
| Secondary | `#8B5CF6` | `--color-secondary` |
| Background | `#F8FAFC` | `--color-background` |
| Text | `#18181B` | `--color-text` |
| Muted | `#71717A` | `--color-muted` |
| Success | `#22C55E` | `--color-success` |
| Warning | `#F59E0B` | `--color-warning` |
| Danger | `#EF4444` | `--color-danger` |

Usage mapping (priority levels, status colors, etc.) is defined in `PRD.md §7.2.1` — implement it exactly as written there, don't invent a different mapping.

---

## 6. App Branding / Configurable App Name

The product's display name (shown in the header, browser tab title, emails, etc.) must **not** be hardcoded anywhere in the UI. It is stored in a single-row `AppSettings` table (see `prisma.schema` addition in Module 3) with a default value of `"TechSentry"`, and is editable from **Settings → Admin** by an `ORG_OWNER`. All places that currently would say the product name (page `<title>`, sidebar logo text, email templates) must read from this setting via a small `getAppSettings()` server-side helper, cached appropriately.

> This is an addition on top of the source PRD (which didn't define app-level branding config) — flagged here so it isn't lost or treated as optional.

---

## 7. Environment Variables (baseline)

```
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
RESEND_API_KEY=
UPLOADTHING_TOKEN=
```

Add to `.env.example` as each module introduces a new one — never commit a real `.env`.
