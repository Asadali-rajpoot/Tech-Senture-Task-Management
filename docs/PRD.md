> **Naming note:** This PRD was originally authored using the prototype name "Tasklane" (as seen in the UI mockups). The actual product being built is internally called **TechSentry**, with its display name stored as an admin-configurable setting rather than hardcoded — see `ARCHITECTURE.md §6` and `DEVELOPMENT_PLAN.md` Module 24. Treat every "Tasklane" reference below as that configurable name's default value, not a fixed brand.

**PRODUCT REQUIREMENTS DOCUMENT**

**Tasklane**

*Multi-Organization Task & Project Management Platform*

Version 1.0

September 2026

**Status: Draft for Review**

*Prepared from: Product Specification, System ERD, and UI/UX Design
Prototypes*

**Table of Contents**

1. Executive Summary

2. Product Vision & Objectives

3. Target Users & Personas

4. Scope

5. Data Model (ERD Summary)

6. Functional Requirements

7. UI/UX Overview

8. Roadmap

9. Non-Functional Requirements

10. Assumptions & Open Questions

# 1 Executive Summary

Tasklane is a multi-organization task and project management platform
designed to give companies a single, structured workspace for planning,
assigning, and tracking work across teams. The product organizes work
through a strict four-level hierarchy --- Organization → Project → Team
→ Task --- giving leadership org-wide visibility while keeping
day-to-day execution owned by individual teams.

This PRD consolidates three source artifacts into one authoritative
reference for engineering, design, and QA:

-   The Product Specification --- scope, roles, feature list, and phased
    roadmap.

-   The System ERD --- the relational data model underlying the product
    (organizations, projects, teams, tasks, and supporting entities).

-   UI/UX design prototypes --- onboarding, dashboard, and task views
    (List, Board, Calendar), branded as "Tasklane".

Authentication, team creation, membership, and basic task CRUD are
already implemented. This document defines the requirements for the
remaining six delivery phases, from organizational hierarchy through
reporting and analytics.

# 2 Product Vision & Objectives

## 2.1 Vision Statement

To give every organization --- regardless of size --- one connected
place to structure work from company-wide strategy down to a single
subtask, without losing visibility at any level of the hierarchy.

## 2.2 Objectives

-   Provide strict multi-tenant data isolation so organizations can
    safely share the same platform.

-   Model real organizational structure (Org → Project → Team → Task)
    instead of a flat task list.

-   Give teams a familiar, fast task-management surface (List, Board,
    Calendar, Timeline views).

-   Layer collaboration (comments, mentions, notifications) and
    reporting (dashboards, workload views) on top of a stable execution
    core.

## 2.3 Success Metrics

  -----------------------------------------------------------------------
  **Metric**                 **Target**     **Notes**
  -------------------------- -------------- -----------------------------
  Org onboarding completion  ≥ 80%          Users who start workspace
  rate                                      creation and finish it

  Weekly active teams per    ≥ 70% of       Indicates real adoption, not
  organization               created teams  just setup

  Task board interaction     < 150 ms      Drag-and-drop status/reorder
  latency                    perceived      actions

  Overdue task rate          Trending down  Tracked via dashboard overdue
                             QoQ            widget

  Notification-to-action     < 24 hrs      Time from
  time                       median         @mention/assignment to task
                                            open
  -----------------------------------------------------------------------

# 3 Target Users & Personas

+----------------+-----------+-----------------------+---------------+
| **Persona**    | **Org     | **Primary Goals**     | **Key         |
|                | Role**    |                       | Screens**     |
+================+===========+=======================+===============+
| Org Owner /    | ORG_OWNER | See all projects at a | Org           |
| Admin (e.g.    | /         | glance                | Dashboard,    |
| Founder, Ops   | ORG_ADMIN |                       | Project list, |
| Lead)          |           | Manage org-wide       | Member        |
|                |           | members &             | management    |
|                |           | billing-level         |               |
|                |           | settings              |               |
|                |           |                       |               |
|                |           | Spot at-risk projects |               |
|                |           | early                 |               |
+----------------+-----------+-----------------------+---------------+
| Team Owner     | ORG       | Set up and staff a    | Team          |
| (e.g.          | _MEMBER + | team                  | settings,     |
| Engineering    | Team      |                       | Board view,   |
| Manager)       | OWNER     | Prioritize and assign | Workload view |
|                |           | team's tasks         |               |
|                |           |                       |               |
|                |           | Review team workload  |               |
+----------------+-----------+-----------------------+---------------+
| Team Member    | ORG       | See exactly what's   | "My Tasks", |
| (e.g.          | _MEMBER + | due today             | Board view,   |
| Individual     | Team      |                       | Notifications |
| Contributor    | MEMBER    | Update task status    |               |
| --- "Maya")  |           | quickly               |               |
|                |           |                       |               |
|                |           | Get notified when     |               |
|                |           | tagged or assigned    |               |
+----------------+-----------+-----------------------+---------------+

# 4 Scope

## 4.1 Multi-Tenancy

-   The platform supports multiple organizations, fully isolated from
    one another.

-   A user belongs to exactly one organization --- no cross-organization
    membership or org switching.

-   All data (projects, teams, tasks, and their child records) is scoped
    to the organization it belongs to; no organization can read or write
    another organization's data.

## 4.2 Hierarchy Rules

1.  An Organization contains multiple Projects.

2.  A Project is categorized by a domain/category (e.g. Sales,
    Development, Other) and can have multiple Teams assigned to it.

3.  A Team manages its own members and its own Tasks.

4.  A Task belongs to exactly one Team, can be assigned to at most one
    member, and can contain Subtasks.

This hierarchy is illustrated below:

**Organization** → **Project** → **Team** → **Task** *→ Subtask*

## 4.3 Roles & Permissions

Two independent role layers exist. A user's organization-level role is
independent of their role within any individual team --- e.g. an
ORG_MEMBER can simultaneously be the OWNER of one team and a MEMBER of
another.

  ----------------------------------------------------------------------------
  **Layer**            **Roles**             **Controls**
  -------------------- --------------------- ---------------------------------
  Organization-level   ORG_OWNER, ORG_ADMIN, Organization settings, project &
                       ORG_MEMBER            team creation/management, member
                                             management across the org

  Team-level           OWNER, MEMBER         Team editing/deletion, membership
                                             within that specific team (e.g.
                                             only the team OWNER can delete
                                             the team)
  ----------------------------------------------------------------------------

## 4.4 Task Board Interaction Rules

-   Tasks can be moved between status columns (To Do, In Progress, Done)
    via drag-and-drop; dropping a task into a column updates its status
    field.

-   Tasks can be manually reordered within a status column via
    drag-and-drop (persisted via a float `position` value on the Task
    record).

-   Task assignment is NOT performed via drag-and-drop --- it remains a
    selection-based action through a dropdown/form, to avoid accidental
    reassignment.

## 4.5 Out of Scope (v1)

-   Cross-organization collaboration or guest access from outside an
    org.

-   Native mobile applications (web-responsive only for this release).

-   Billing/subscription management screens (assumed handled separately
    or in a later phase).

-   Third-party integrations (Slack, GitHub, Google Calendar, etc.) ---
    candidate for a future phase.

# 5 Data Model (ERD Summary)

The data model below is derived from the system ERD and defines the core
entities and their relationships. It underpins every functional
requirement in Section 6.

## 5.1 Core Hierarchy Entities

  --------------------------------------------------------------------------
  **Entity**     **Key Fields**                 **Relationships**
  -------------- ------------------------------ ----------------------------
  Organization   id, name, createdAt            1:N → Project, 1:N → User
                                                (employs)

  Project        id, name, domain,              N:1 → Organization, 1:N →
                 organizationId, createdAt      Team

  Team           id, name, description,         N:1 → Project, 1:N →
                 creatorId, projectId,          Membership, 1:N → Task, 1:N
                 createdAt                      → Label

  User           id, name, email, passwordHash, N:1 → Organization, 1:N →
                 image, organizationId,         Membership, Session,
                 orgRole, createdAt             Account, Comment, Attachment

  Membership     id, role, joinedAt, userId,    N:1 → User, N:1 → Team (join
                 teamId                         table for team roles)
  --------------------------------------------------------------------------

## 5.2 Task & Collaboration Entities

  -----------------------------------------------------------------------
  **Entity**   **Key Fields**                      **Relationships**
  ------------ ----------------------------------- ----------------------
  Task         id, title, description, status,     N:1 → Team; N:1 → User
               priority, dueDate, position,        (creator & assignee);
               teamId, assigneeId, creatorId,      1:N → Subtask,
               createdAt, updatedAt                Comment, Attachment;
                                                   M:N → Label

  Subtask      id, title, isCompleted, taskId,     N:1 → Task
               createdAt, updatedAt                

  Label        id, name, color, teamId             N:1 → Team; M:N → Task
                                                   ("tagged with")

  Comment      id, content, taskId, authorId,      N:1 → Task; N:1 → User
               createdAt, updatedAt                (author)

  Attachment   id, fileName, fileUrl, fileSize,    N:1 → Task; N:1 → User
               mimeType, taskId, uploaderId,       (uploader)
               createdAt                           
  -----------------------------------------------------------------------

## 5.3 Auth & Session Entities

Session, Account, and VerificationToken follow a standard
credential/OAuth auth model (already implemented per the roadmap note in
Section 8) and support multi-provider sign-in tied back to User.

# 6 Functional Requirements

## 6.1 Organization-Level

### 6.1.1 Organization Creation & Profile Management

-   As a new user, I can create an organization/workspace with a name
    during onboarding.

-   As an ORG_OWNER, I can edit the organization's profile (name,
    workspace details) at any time.

**Acceptance criteria:**

-   Creating an org auto-assigns the creator as ORG_OWNER.

-   Org name is required and unique within the platform's routing (e.g.
    workspace slug).

### 6.1.2 Organization-Wide Member Invitations

-   As an ORG_OWNER/ORG_ADMIN, I can invite new members by email.

-   As an invited user, I receive an email with a link to join the
    organization.

**Acceptance criteria:**

-   Invite defaults to ORG_MEMBER unless a different role is explicitly
    selected.

-   Pending invites are visible and revocable by an ORG_ADMIN or
    ORG_OWNER.

### 6.1.3 Organization-Level Roles

-   As an ORG_OWNER, I can promote/demote members between ORG_ADMIN and
    ORG_MEMBER.

-   As an ORG_ADMIN, I can manage projects and members but cannot delete
    the organization or remove the ORG_OWNER.

**Acceptance criteria:**

-   Only one or more ORG_OWNERs can transfer/revoke owner status.

-   Role changes take effect immediately and are reflected in the member
    list.

### 6.1.4 Organization-Wide Dashboard

-   As any org member, I see a dashboard summarizing all projects I have
    access to on login.

**Acceptance criteria:**

-   Dashboard reflects the "Good morning, {name}" pattern from the
    design prototype, showing active projects and My Tasks at a glance.

## 6.2 Project-Level

### 6.2.1 Project CRUD & Archiving

-   As an ORG_ADMIN/ORG_OWNER, I can create, edit, and archive a
    project.

-   As a user, I can view a list of all projects across my team.

**Acceptance criteria:**

-   Archived projects are hidden from active lists but remain accessible
    for reporting/history.

-   Deleting is not permitted for projects with active teams/tasks
    without explicit confirmation of cascading effects.

### 6.2.2 Project Categorization

-   As a project creator, I select a domain/category for the project
    (e.g. Sales, Development, Other) at creation time.

**Acceptance criteria:**

-   Domain is a required field and is filterable in project lists and
    org-wide search.

### 6.2.3 Team Assignment to Projects

-   As an ORG_ADMIN/ORG_OWNER, I can assign one or more existing teams
    to a project.

**Acceptance criteria:**

-   A team belongs to exactly one project at a time (per the ERD's
    Project 1:N Team relationship).

### 6.2.4 Project-Level Progress Overview

-   As a project stakeholder, I can view an aggregated progress view
    across all teams within that project.

**Acceptance criteria:**

-   Progress overview shows task status breakdown aggregated from every
    team under the project.

## 6.3 Team-Level

### 6.3.1 Team Creation & Member Management

-   As an ORG_MEMBER with sufficient permission, I can create a team
    under a project and add members via Membership records.

**Acceptance criteria:**

-   Team creation requires selecting a parent Project.

-   Adding a member creates a Membership record linking User ↔ Team with
    a default role of MEMBER.

### 6.3.2 Team-Level Roles & Restrictions

-   As a Team OWNER, I can manage team membership and delete the team.

-   As a Team MEMBER, I can view and work within the team but cannot
    delete it or remove other members.

**Acceptance criteria:**

-   Team deletion is restricted to the Team OWNER role only.

-   Removing the last OWNER from a team is blocked, or triggers an
    ownership-transfer prompt.

## 6.4 Task Views

### 6.4.1 List View

-   As a team member, I can view tasks in a sortable, filterable table
    with columns for Task, Status, Priority, Assignee, and Project.

-   As a user, I see an empty state ("No tasks found --- try a
    different search term") when a filter returns nothing.

**Acceptance criteria:**

-   List supports search-as-you-type plus filter chips for team,
    assignee, status, and priority.

### 6.4.2 Board (Kanban) View

-   As a team member, I can view tasks grouped into To Do / In Progress
    / Done columns.

-   As a team member, I can drag a task card to a different column to
    update its status, or reorder within a column.

**Acceptance criteria:**

-   Column drop updates `status`; in-column drag updates the
    `position` float per the interaction rules in Section 4.4.

-   Empty columns show a "No tasks here" state consistent with the
    design prototype.

### 6.4.3 Calendar View

-   As a team member, I can see tasks plotted on a monthly calendar by
    their due date.

**Acceptance criteria:**

-   Tasks with no due date are excluded from the calendar and remain
    visible in List/Board views.

-   Clicking a date cell's task opens the task detail panel.

### 6.4.4 Timeline View

-   As a team member/project lead, I can see tasks laid out on a
    horizontal timeline by start and end date.

**Acceptance criteria:**

-   Timeline requires a task to have both a start and end date to render
    a bar; tasks without one show as a point marker or are excluded (to
    be finalized in design).

## 6.5 Task Management

### 6.5.1 Task CRUD & Assignment

-   As a team member, I can create, edit, delete, and assign a task to
    one member of the team.

**Acceptance criteria:**

-   Assignment is selection-based (dropdown), never drag-and-drop, per
    Section 4.4.

-   Only the assignee, creator, or a Team OWNER can delete a task
    (permission model to be confirmed with engineering).

### 6.5.2 Priority Levels

-   As a task creator, I can set priority to Low, Medium, or High.

**Acceptance criteria:**

-   Priority is visually color-coded consistently across List, Board,
    and Calendar views.

### 6.5.3 Due Dates & Login Reminders

-   As a user, I see a reminder of upcoming/overdue tasks assigned to me
    when I log in.

**Acceptance criteria:**

-   Overdue tasks are visually flagged (e.g. red "Overdue" badge) in
    dashboard and list/board views.

### 6.5.4 Subtasks / Checklists

-   As a task owner, I can add subtasks with a title and completion
    checkbox.

**Acceptance criteria:**

-   Task-level progress (e.g. "3/5 subtasks complete") is derived from
    Subtask.isCompleted.

### 6.5.5 Labels & Tags

-   As a team member, I can create color-coded labels scoped to my team
    and apply multiple labels to a task.

**Acceptance criteria:**

-   Labels are a many-to-many relationship with tasks (per ERD); label
    management lives at the team level.

### 6.5.6 Comments

-   As a team member, I can comment on a task to discuss progress or
    blockers.

**Acceptance criteria:**

-   Comments are timestamped, attributed to an author, and editable by
    their author.

### 6.5.7 File Attachments

-   As a team member, I can attach files to a task.

**Acceptance criteria:**

-   Attachment stores fileName, fileUrl, fileSize, and mimeType; upload
    size limits to be defined with engineering/infra.

### 6.5.8 Task Dependencies

-   As a project/team lead, I can mark a task as dependent on another
    task.

**Acceptance criteria:**

-   The UI should warn (not hard-block) when marking a dependent task
    "Done" while its predecessor is incomplete --- exact enforcement
    rule to be confirmed.

### 6.5.9 Recurring Tasks

-   As a team member, I can configure a task to recur on a schedule
    (e.g. daily, weekly, monthly).

**Acceptance criteria:**

-   On completion of a recurring task instance, a new instance is
    generated per the configured recurrence rule.

### 6.5.10 Time Tracking / Estimates

-   As a team member, I can log an estimate and/or actual time spent on
    a task.

**Acceptance criteria:**

-   Estimates roll up into the per-team and per-member workload views
    (Section 6.8).

### 6.5.11 Activity Log

-   As a team member, I can view a chronological change history for a
    task (status changes, reassignment, edits).

**Acceptance criteria:**

-   Activity log is read-only and captures actor, field changed, old/new
    value, and timestamp.

## 6.6 Collaboration

### 6.6.1 @Mentions

-   As a commenter, I can @mention a team member in a comment to notify
    them directly.

**Acceptance criteria:**

-   Mentioned users receive both an in-app and (if enabled) an email
    notification, per the notification settings screen in the prototype.

### 6.6.2 Notifications

-   As a user, I receive in-app and/or email notifications for task
    assignment, new comments, and approaching due dates.

-   As a user, I can toggle notification categories (task reminders,
    weekly digest, email notifications) in Settings.

**Acceptance criteria:**

-   Notification preferences persist per-user and are respected by all
    triggering events (assignment, comment, @mention, due date).

## 6.7 Search & Filtering

### 6.7.1 Task Filtering

-   As a user, I can filter tasks by team, assignee, status, and
    priority in any task view.

**Acceptance criteria:**

-   Filters are combinable (AND logic) and persist while navigating
    between List/Board/Calendar for the same context.

### 6.7.2 Organization-Wide Search

-   As a user, I can search across projects, teams, and tasks within my
    organization from a single search entry point.

**Acceptance criteria:**

-   Search results are scoped strictly to the user's organization
    (multi-tenancy boundary, Section 4.1).

### 6.7.3 Saved / Custom Filter Views

-   As a user, I can save a combination of filters as a named view for
    quick reuse.

**Acceptance criteria:**

-   Saved views are personal by default; a "shared with team" option
    may be considered in a later iteration.

## 6.8 Reporting & Analytics

### 6.8.1 Dashboard Widgets

-   As a user, I see widgets summarizing task status breakdown and
    overdue task counts.

**Acceptance criteria:**

-   Widgets reflect the "Total Tasks", status, and "Overdue"
    elements present in the dashboard prototype.

### 6.8.2 Workload Views

-   As a Team OWNER/ORG_ADMIN, I can view task load per team and per
    member to spot over- or under-allocation.

**Acceptance criteria:**

-   Workload view accounts for time estimates (6.5.10) where available,
    and task counts otherwise.

# 7 UI/UX Overview

The following screens exist as high-fidelity prototypes (branded
"Tasklane") and define the baseline UX the engineering build should
match. Screen names below map directly to the provided design files.

  -----------------------------------------------------------------------
  **Screen / Flow**   **Key Elements Observed in Prototype**
  ------------------- ---------------------------------------------------
  Sign up / Login     "Create your account", "Sign in to continue to
                      your workspace", email + password fields

  Onboarding ---      "Create your workspace", workspace name, team
  Create Workspace    size, "Step 2 of 2" multi-step flow

  Org Dashboard       "Good morning, Maya" greeting, "All active
                      projects across your team", Total Tasks / Overdue
                      widgets

  My Tasks            "Everything assigned to you, in one list"

  Projects            "New project", project name + domain fields,
                      "Create project"

  Team                "People working across your projects", invite by
                      email, role assignment

  Task List View      Table with Task / Status / Priority / Assignee /
                      Project columns, search, empty state

  Task Board View     To Do / In Progress / Done columns, drag-and-drop
                      cards, empty-column state

  Task Calendar View  Month grid (e.g. "September 2026") with tasks
                      plotted by due date

  Task Detail         Title, Description, Status, Priority, Due date,
                      Assignee, Comments, Attachments

  Settings ---        Full name, work email, "Change photo", "Save
  Profile             changes"

  Settings ---        Current/new password, "Two-factor authentication
  Security            --- add an extra layer of security"

  Settings ---        Email notifications, task reminders, weekly digest
  Notifications       toggles
  -----------------------------------------------------------------------

## 7.1 Design Notes for Engineering

-   Onboarding is a two-step flow: account creation, then workspace
    creation ("Step 2 of 2") --- this maps to User creation followed
    by Organization creation in the data model.

-   Empty states are treated as first-class UI (e.g. "No tasks found",
    "No tasks here") and should be implemented for every
    list/board/calendar, not left as blank space.

-   The dashboard greeting pattern ("Good morning, {first name}")
    should be time-of-day aware (morning/afternoon/evening).

## 7.2 Color Palette (Design System)

The following tokens define Tasklane's visual language and should be
implemented as CSS/theme variables so every screen (including future
dark-mode work) stays consistent.

  -------------------------------------------------------------------------
  **Token**        **Swatch**   **Hex**        **Usage**
  ---------------- ------------ -------------- ----------------------------
  **Primary**                   #6366F1        Primary actions, active nav
                                               items, links, focus rings

  **Secondary**                 #8B5CF6        Secondary actions,
                                               gradients/accents alongside
                                               Primary

  **Background**                #F8FAFC        App background / page canvas

  **Text**                      #18181B        Primary body and heading
                                               text

  **Muted**                     #71717A        Secondary text,
                                               placeholders, timestamps,
                                               helper copy

  **Success**                   #22C55E        Completed status, positive
                                               confirmations (e.g. task
                                               Done)

  **Warning**                   #F59E0B        Medium priority, due-soon
                                               states, non-blocking alerts

  **Danger**                    #EF4444        High priority, overdue
                                               badges, destructive actions
  -------------------------------------------------------------------------

### 7.2.1 Suggested Usage Mapping

-   Priority (6.5.2): Low → Muted, Medium → Warning, High → Danger.

-   Task status: To Do → Muted, In Progress → Primary, Done → Success.

-   Overdue badge (6.5.3) and destructive actions (delete
    team/project/task) → Danger.

-   Primary buttons, active tabs, and the org/team "Create" CTAs →
    Primary; secondary buttons and highlighted accents → Secondary.

-   Cards, panels, and the main canvas → Background, with Text/Muted for
    typography hierarchy.

# 8 Roadmap

Authentication, team creation, membership, and basic task CRUD are
already built and are excluded from the phases below. Each phase builds
on the data model and structure established by the previous one ---
hierarchy and core workflow are sequenced first, with collaboration and
reporting layered on afterward.

**Phase 1 --- Organization & Project Hierarchy**

-   Introduce Organization and Project as first-class entities.

-   Migrate existing teams under a project; add organization-level and
    team-level roles.

-   Enforce data isolation between organizations.

**Phase 2 --- Kanban Board**

-   Board view with status columns (To Do / In Progress / Done).

-   Drag-and-drop status updates and drag-and-drop reordering within a
    column.

**Phase 3 --- Richer Task Details**

-   Labels/tags, comments on tasks, file attachments.

-   Task dependencies.

**Phase 4 --- Additional Views**

-   Calendar view (by due date).

-   Timeline view (start/end dates).

**Phase 5 --- Collaboration & Notifications**

-   @mentions in comments.

-   In-app/email notifications (assignment, comments, due dates).

-   Activity log per task.

**Phase 6 --- Reporting & Analytics**

-   Organization-wide dashboard (status breakdown, overdue counts).

-   Per-team and per-member workload view.

*Note: Recurring tasks and time tracking/estimates (Sections
6.5.9--6.5.10) are listed in the feature scope but are not yet slotted
into a phase in the source roadmap --- recommend placing them in Phase 3
or a new Phase 3.5, to be confirmed with the team.*

# 9 Non-Functional Requirements

  -----------------------------------------------------------------------
  **Category**        **Requirement**
  ------------------- ---------------------------------------------------
  Multi-tenancy &     Strict organization-level data isolation enforced
  Security            at the query/data-access layer, not just the UI.
                      Passwords stored as hashes (passwordHash); OAuth
                      via Account entity.

  Performance         Board drag-and-drop interactions should feel
                      instantaneous (<150ms perceived); dashboard
                      widgets should load within 1--2s for organizations
                      with typical data volumes.

  Scalability         Data model must support organizations ranging from
                      small teams to large multi-project enterprises
                      without schema changes.

  Availability        Core task CRUD and board interactions should
                      degrade gracefully (e.g. optimistic UI updates)
                      under network latency.

  Auditability        All task-level changes must be captured in the
                      Activity Log (6.5.11) with actor and timestamp.

  Accessibility       Drag-and-drop interactions (task board) should have
                      a keyboard/menu-based fallback for status changes
                      and reordering.
  -----------------------------------------------------------------------

# 10 Assumptions & Open Questions

## 10.1 Assumptions

-   Authentication (Session, Account, VerificationToken entities) is
    already implemented and out of scope for this PRD's phases.

-   "Domain" on Project is a fixed or admin-configurable enum (e.g.
    Sales, Development, Other), not free text.

-   A Task's single `assigneeId` means tasks cannot be co-assigned to
    multiple users in v1.

## 10.2 Open Questions for Stakeholders

1.  Should ORG_ADMIN be able to delete an entire Project, or is that
    restricted to ORG_OWNER only?

2.  What is the enforcement behavior for task dependencies --- hard
    block or soft warning (Section 6.5.8)?

3.  Which phase should Recurring Tasks and Time Tracking be delivered in
    (not currently placed in the roadmap)?

4.  Are saved filter views (6.7.3) shareable with a team, or strictly
    personal in v1?

5.  What are the file size/type limits for Attachments, and where are
    files stored?
