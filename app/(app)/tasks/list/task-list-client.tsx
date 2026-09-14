"use client";

import React, { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedViewsBar, type TaskFilterState } from "@/components/tasks/saved-views-bar";
import { TaskViewSwitcher } from "@/components/tasks/task-view-switcher";
import {
  createTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  updateTaskAssigneeAction,
  deleteTaskAction,
  type TaskActionResponse,
} from "../actions";
import {
  TaskPriority,
  TaskStatus,
  ProjectDomain,
  TeamRole,
  OrgRole,
  RecurrenceRule,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  FolderKanban,
  Users,
  Edit,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  LayoutList,
  Kanban,
  CalendarDays,
  GanttChartSquare,
  Link2,
  Repeat,
} from "lucide-react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date | string;
  uploader: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface TaskDependencyItem {
  id: string;
  dependentTaskId: string;
  dependsOnTaskId: string;
  dependsOnTask: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | string | null;
  };
}

export interface TaskDependentItem {
  id: string;
  dependentTaskId: string;
  dependsOnTaskId: string;
  dependentTask: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | string | null;
  };
}

export interface TaskTimeEntry {
  id: string;
  durationMinutes: number;
  note: string | null;
  loggedAt: Date | string;
  createdAt?: Date | string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export interface TaskActivityItem {
  id: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: string | null;
  createdAt: Date | string;
  actor?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  recurrence?: RecurrenceRule;
  parentId?: string | null;
  startDate?: Date | string | null;
  dueDate: Date | string | null;
  estimatedHours?: number | null;
  timeEntries?: TaskTimeEntry[];
  activities?: TaskActivityItem[];
  createdAt: Date | string;
  position: number;
  labels: TaskLabel[];
  subtasks: TaskSubtask[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  dependencies?: TaskDependencyItem[];
  dependents?: TaskDependentItem[];
  team: {
    id: string;
    name: string;
    labels?: TaskLabel[];
    project: {
      id: string;
      name: string;
      domain: ProjectDomain;
    };
  };
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
  _count: {
    subtasks: number;
    comments: number;
    attachments: number;
    labels: number;
    dependencies?: number;
    dependents?: number;
    timeEntries?: number;
    activities?: number;
  };
}

export interface TeamWithMembers {
  id: string;
  name: string;
  labels?: TaskLabel[];
  project: {
    id: string;
    name: string;
    domain: ProjectDomain;
  };
  memberships: {
    role: TeamRole;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      orgRole?: OrgRole;
    };
  }[];
}

interface TaskListClientProps {
  initialTasks: TaskItem[];
  teams: TeamWithMembers[];
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    orgRole: OrgRole;
  };
}

export function TaskListClient({
  initialTasks,
  teams,
  currentUser,
}: TaskListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter state synced with URL params
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "ALL";
  const initialPriority = searchParams.get("priority") || "ALL";
  const initialTeam = searchParams.get("team") || "ALL";
  const initialAssignee = searchParams.get("assignee") || "ALL";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState<string>(initialPriority);
  const [teamFilter, setTeamFilter] = useState<string>(initialTeam);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(initialAssignee);

  const handleApplySavedView = (filters: TaskFilterState) => {
    setSearchQuery(filters.search || "");
    setStatusFilter(filters.status || "ALL");
    setPriorityFilter(filters.priority || "ALL");
    setTeamFilter(filters.teamId || "ALL");
    setAssigneeFilter(filters.assigneeId || "ALL");
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedDetailTask, setSelectedDetailTask] = useState<TaskItem | null>(
    null
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [selectedCreateTeamId, setSelectedCreateTeamId] = useState<string>(
    teams[0]?.id || ""
  );

  const [isPending, startTransition] = useTransition();
  const [isCreatePending, startTransitionCreate] = useTransition();
  const [isUpdatePending, startTransitionUpdate] = useTransition();

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);

    startTransitionCreate(async () => {
      try {
        const res = await createTaskAction({}, formData);
        if (res.error) {
          setCreateError(res.error);
        } else {
          setIsCreateOpen(false);
          setSuccessMessage(res.success || "Task created successfully!");
          setTimeout(() => setSuccessMessage(null), 4000);
          router.refresh();
        }
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Failed to create task");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    setUpdateError(null);
    const formData = new FormData(e.currentTarget);

    startTransitionUpdate(async () => {
      try {
        const res = await updateTaskAction({}, formData);
        if (res.error) {
          setUpdateError(res.error);
        } else {
          setEditingTask(null);
          setSuccessMessage(res.success || "Task updated successfully!");
          setTimeout(() => setSuccessMessage(null), 4000);
          router.refresh();
        }
      } catch (err) {
        setUpdateError(err instanceof Error ? err.message : "Failed to update task");
      }
    });
  };

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to delete task "${taskTitle}"?`)) {
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("taskId", taskId);
        const res = await deleteTaskAction({}, fd);
        if (res.success) {
          setSuccessMessage(res.success);
          setTimeout(() => setSuccessMessage(null), 4000);
          router.refresh();
        } else if (res.error) {
          setWarningMessage(res.error);
        }
      } catch (err) {
        setWarningMessage("Failed to delete task");
      }
    });
  };

  // Filter tasks
  const now = new Date();
  const filteredTasks = initialTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" || task.status === statusFilter;

    const matchesPriority =
      priorityFilter === "ALL" || task.priority === priorityFilter;

    const matchesTeam = teamFilter === "ALL" || task.team.id === teamFilter;

    const matchesAssignee =
      assigneeFilter === "ALL"
        ? true
        : assigneeFilter === "UNASSIGNED"
          ? task.assignee === null
          : task.assignee?.id === assigneeFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesTeam &&
      matchesAssignee
    );
  });

  // Extract distinct assignees for filter
  const allAssignees = Array.from(
    new Map(
      teams
        .flatMap((t) => t.memberships.map((m) => m.user))
        .map((u) => [u.id, u])
    ).values()
  );

  // Members of selected team in create modal
  const selectedTeamMembers =
    teams.find((t) => t.id === selectedCreateTeamId)?.memberships.map((m) => m.user) ||
    [];

  // Priority badge styling (PRD.md §7.2.1: Low -> Muted, Medium -> Warning, High -> Danger)
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "bg-danger/15 text-danger border-danger/30";
      case TaskPriority.MEDIUM:
        return "bg-warning/15 text-warning border-warning/30";
      case TaskPriority.LOW:
      default:
        return "bg-muted/15 text-muted border-border";
    }
  };

  // Status badge styling (PRD.md §7.2.1: To Do -> Muted, In Progress -> Primary, Done -> Success)
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return "bg-success/15 text-success border-success/30";
      case TaskStatus.IN_PROGRESS:
        return "bg-primary/15 text-primary border-primary/30";
      case TaskStatus.TODO:
      default:
        return "bg-muted/15 text-muted border-border";
    }
  };

  const isOverdue = (dueDate: Date | string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.DONE) return false;
    return new Date(dueDate) < now;
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    teamFilter !== "ALL" ||
    assigneeFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTeamFilter("ALL");
    setAssigneeFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation View Switcher */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted text-xs sm:text-sm">
            Manage, assign, and track tasks across all your teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Tabs */}
          <TaskViewSwitcher currentView="list" />

          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={teams.length === 0}
            className="bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold text-white shadow-xs"
          >
            <Plus className="size-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* No Teams Notice */}
      {teams.length === 0 && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between rounded-xl border p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <p>
              You need to create at least one Team under a Project before creating tasks.
            </p>
          </div>
          <Link href="/teams">
            <Button size="sm" variant="outline" className="border-warning/40 text-xs">
              Go to Teams
            </Button>
          </Link>
        </div>
      )}

      {/* Action Alerts */}
      {warningMessage && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between rounded-lg border p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <p>{warningMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="hover:opacity-75"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="border-success/30 bg-success/10 text-success flex items-center justify-between rounded-lg border p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0" />
            <p>{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="hover:opacity-75"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Search & Combinable Filters Bar */}
      <div className="border-border bg-card space-y-3 rounded-xl border p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="border-border bg-background flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-xs lg:w-72">
            <Search className="text-muted size-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-text placeholder:text-muted w-full bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted hover:text-text"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-border bg-background text-text rounded-lg border px-2.5 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">Status: All</option>
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.DONE}>Done</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border-border bg-background text-text rounded-lg border px-2.5 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">Priority: All</option>
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
            </select>

            {/* Team Filter */}
            {teams.length > 0 && (
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="border-border bg-background text-text rounded-lg border px-2.5 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">Team: All</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.project.name})
                  </option>
                ))}
              </select>
            )}

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="border-border bg-background text-text rounded-lg border px-2.5 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">Assignee: All</option>
              <option value="UNASSIGNED">Unassigned</option>
              {allAssignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted hover:text-text h-7 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Saved Views Quick Access Bar */}
        <SavedViewsBar
          currentFilters={{
            search: searchQuery,
            status: statusFilter,
            priority: priorityFilter,
            teamId: teamFilter,
            assigneeId: assigneeFilter,
          }}
          onApplyView={handleApplySavedView}
        />
      </div>

      {/* Task List Table */}
      {filteredTasks.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-12 text-center shadow-xs">
          <CheckSquare className="text-muted/50 mx-auto size-12" />
          <h3 className="text-text mt-4 text-base font-semibold">
            {hasActiveFilters
              ? "No tasks found — try a different search term"
              : "No tasks yet"}
          </h3>
          <p className="text-muted mx-auto mt-1 max-w-sm text-xs">
            {hasActiveFilters
              ? "No tasks match your current filter combination."
              : "Get started by creating your first task for your team."}
          </p>
          {hasActiveFilters ? (
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            teams.length > 0 && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary hover:bg-primary/90 mt-5 gap-1.5 text-xs font-semibold text-white shadow-xs"
              >
                <Plus className="size-4" />
                <span>Create Task</span>
              </Button>
            )
          )}
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-border bg-background/50 text-muted border-b text-[11px] font-semibold uppercase">
                  <th className="py-3 pr-4 pl-6">Task</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Priority</th>
                  <th className="py-3 pr-4">Assignee</th>
                  <th className="py-3 pr-4">Project & Team</th>
                  <th className="py-3 pr-4">Time</th>
                  <th className="py-3 pr-4">Due Date</th>
                  <th className="py-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);

                  // Team members for immediate dropdown reassignment
                  const currentTeam = teams.find(
                    (t) => t.id === task.team.id
                  );
                  const teamMembers = currentTeam?.memberships.map((m) => m.user) || [];

                  const completedSubtasks = (task.subtasks || []).filter(
                    (s) => s.isCompleted
                  ).length;
                  const totalSubtasks = task.subtasks?.length || task._count?.subtasks || 0;

                  return (
                    <tr
                      key={task.id}
                      className="group hover:bg-background/60 transition-colors"
                    >
                      {/* Task Column (Title, Labels, Subtask progress, Description, Overdue badge) */}
                      <td className="py-3.5 pr-4 pl-6">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailTask(task)}
                              className="text-text group-hover:text-primary text-left font-semibold transition-colors hover:underline"
                            >
                              {task.title}
                            </button>
                            {overdue && (
                              <span className="bg-danger/15 text-danger border-danger/30 rounded border px-1.5 py-0.2 text-[10px] font-bold tracking-wide uppercase">
                                Overdue
                              </span>
                            )}
                          </div>

                          {/* Labels and Subtasks preview */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {task.labels &&
                              task.labels.map((label) => (
                                <span
                                  key={label.id}
                                  className="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              ))}

                            {totalSubtasks > 0 && (
                              <span className="border-border bg-background text-muted inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10px] font-semibold">
                                <CheckSquare className="size-2.5" />
                                <span>
                                  {completedSubtasks}/{totalSubtasks}
                                </span>
                              </span>
                            )}

                            {task.dependencies && task.dependencies.length > 0 && (
                              <span
                                className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10px] font-semibold ${
                                  task.dependencies.some(
                                    (d) =>
                                      d.dependsOnTask.status !== TaskStatus.DONE
                                  )
                                    ? "border-warning/30 bg-warning/15 text-warning"
                                    : "border-border bg-background text-muted"
                                }`}
                                title={`${task.dependencies.length} prerequisite${task.dependencies.length > 1 ? "s" : ""}: ${task.dependencies.map((d) => `${d.dependsOnTask.title} (${d.dependsOnTask.status})`).join(", ")}`}
                              >
                                <Link2 className="size-2.5" />
                                <span>
                                  {task.dependencies.length}{" "}
                                  {task.dependencies.length === 1 ? "dep" : "deps"}
                                </span>
                              </span>
                            )}

                            {task.recurrence &&
                              task.recurrence !== RecurrenceRule.NONE && (
                                <span
                                  className="border-secondary/30 bg-secondary/15 text-secondary inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[10px] font-semibold capitalize"
                                  title={`Repeats ${task.recurrence.toLowerCase()}`}
                                >
                                  <Repeat className="size-2.5" />
                                  <span>{task.recurrence.toLowerCase()}</span>
                                </span>
                              )}
                          </div>

                          {task.description && (
                            <p className="text-muted line-clamp-1 max-w-md text-[11px]">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status Column (Quick dropdown toggle) */}
                      <td className="py-3.5 pr-4">
                        <select
                          value={task.status}
                          onChange={(e) => {
                            const newStatus = e.target.value as TaskStatus;
                            startTransition(async () => {
                              const fd = new FormData();
                              fd.append("taskId", task.id);
                              fd.append("status", newStatus);
                              const res = await updateTaskStatusAction({}, fd);
                              if (res.warning) {
                                setWarningMessage(res.warning);
                              }
                            });
                          }}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-all focus:ring-1 focus:ring-primary focus:outline-none ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          <option value={TaskStatus.TODO}>To Do</option>
                          <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                          <option value={TaskStatus.DONE}>Done</option>
                        </select>
                      </td>

                      {/* Priority Column (Color-coded badge) */}
                      <td className="py-3.5 pr-4">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Assignee Column (Interactive dropdown selector) */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-1.5">
                          <div className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                            {task.assignee
                              ? (task.assignee.name?.[0] || task.assignee.email?.[0] || "U").toUpperCase()
                              : "—"}
                          </div>
                          <select
                            value={task.assignee?.id || "UNASSIGNED"}
                            onChange={(e) => {
                              const newAssigneeId = e.target.value;
                              startTransition(async () => {
                                const fd = new FormData();
                                fd.append("taskId", task.id);
                                fd.append("assigneeId", newAssigneeId);
                                await updateTaskAssigneeAction({}, fd);
                              });
                            }}
                            className="text-text hover:border-border max-w-[130px] truncate rounded border border-transparent bg-transparent py-0.5 text-[11px] transition-colors focus:border-primary focus:bg-background focus:outline-none"
                          >
                            <option value="UNASSIGNED">Unassigned</option>
                            {teamMembers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.email}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Project & Team Column */}
                      <td className="py-3.5 pr-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/projects/${task.team.project.id}`}
                            className="text-text hover:text-primary block truncate font-medium transition-colors"
                          >
                            {task.team.project.name}
                          </Link>
                          <Link
                            href={`/teams/${task.team.id}`}
                            className="text-muted hover:text-text block truncate text-[11px] transition-colors"
                          >
                            {task.team.name}
                          </Link>
                        </div>
                      </td>

                      {/* Time (Logged / Estimated) Column (PRD §6.5.10) */}
                      <td className="py-3.5 pr-4">
                        {(() => {
                          const totalLoggedMinutes = (task.timeEntries || []).reduce(
                            (acc, te) => acc + te.durationMinutes,
                            0
                          );
                          const totalLoggedHours = (totalLoggedMinutes / 60)
                            .toFixed(1)
                            .replace(/\.0$/, "");

                          if (task.estimatedHours != null || totalLoggedMinutes > 0) {
                            return (
                              <div
                                className="flex items-center gap-1 text-[11px] text-muted font-medium"
                                title={`Logged: ${totalLoggedHours}h ${task.estimatedHours != null ? `| Estimated: ${task.estimatedHours}h` : ""}`}
                              >
                                <Clock className="size-3 shrink-0" />
                                <span>
                                  {totalLoggedMinutes > 0 ? `${totalLoggedHours}h` : "0h"}
                                  {task.estimatedHours != null
                                    ? ` / ${task.estimatedHours}h`
                                    : ""}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span className="text-muted/50 text-[11px]">—</span>
                          );
                        })()}
                      </td>

                      {/* Due Date Column */}
                      <td className="py-3.5 pr-4">
                        {task.dueDate ? (
                          <div
                            className={`flex items-center gap-1 text-[11px] ${
                              overdue
                                ? "text-danger font-semibold"
                                : "text-muted"
                            }`}
                          >
                            <Calendar className="size-3 shrink-0" />
                            <span>
                              {new Date(task.dueDate).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted/60 text-[11px]">
                            No date
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDetailTask(task)}
                            className="text-muted hover:text-text size-7 p-0"
                            title="View task details & subtasks"
                          >
                            <CheckSquare className="size-3.5" />
                            <span className="sr-only">Details</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTask(task)}
                            className="text-muted hover:text-text size-7 p-0"
                            title="Edit task"
                          >
                            <Edit className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="text-danger hover:text-danger hover:bg-danger/10 size-7 p-0"
                            title="Delete task"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Detail Modal (Subtasks, Labels, Comments & Mentions) */}
      {selectedDetailTask && (
        <TaskDetailModal
          task={selectedDetailTask}
          teams={teams}
          currentUser={currentUser}
          onClose={() => setSelectedDetailTask(null)}
          onEdit={() => {
            const t = selectedDetailTask;
            setSelectedDetailTask(null);
            setEditingTask(t);
          }}
        />
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-lg space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="text-primary size-5" />
                <h2 className="text-text text-base font-bold">
                  Create New Task
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            {createError && (
              <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{createError}</p>
              </div>
            )}

            <form
              onSubmit={handleCreateSubmit}
              className="space-y-4"
            >
              {/* Team Selector */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-team"
                  className="text-text block text-xs font-semibold"
                >
                  Team *
                </label>
                <select
                  id="task-team"
                  name="teamId"
                  required
                  value={selectedCreateTeamId}
                  onChange={(e) => setSelectedCreateTeamId(e.target.value)}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.project.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-title"
                  className="text-text block text-xs font-semibold"
                >
                  Task Title *
                </label>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Implement user authentication flow"
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  rows={3}
                  placeholder="Add details, acceptance criteria, or notes..."
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              {/* Assignee & Priority & Status Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-assignee"
                    className="text-text block text-xs font-semibold"
                  >
                    Assignee
                  </label>
                  <select
                    id="task-assignee"
                    name="assigneeId"
                    defaultValue=""
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {selectedTeamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-priority"
                    className="text-text block text-xs font-semibold"
                  >
                    Priority *
                  </label>
                  <select
                    id="task-priority"
                    name="priority"
                    defaultValue={TaskPriority.MEDIUM}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-status"
                    className="text-text block text-xs font-semibold"
                  >
                    Status *
                  </label>
                  <select
                    id="task-status"
                    name="status"
                    defaultValue={TaskStatus.TODO}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>
              </div>

              {/* Recurrence, Due Date & Estimate (PRD §6.5.10) Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-recurrence"
                    className="text-text block text-xs font-semibold"
                  >
                    Repeat / Recurrence
                  </label>
                  <select
                    id="task-recurrence"
                    name="recurrence"
                    defaultValue={RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None (Does not repeat)</option>
                    <option value={RecurrenceRule.DAILY}>Daily (Every day)</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly (Every week)</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly (Every month)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-due-date"
                    className="text-text block text-xs font-semibold"
                  >
                    Due Date
                  </label>
                  <input
                    id="task-due-date"
                    name="dueDate"
                    type="date"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-estimated-hours"
                    className="text-text block text-xs font-semibold"
                  >
                    Estimate (Hours)
                  </label>
                  <input
                    id="task-estimated-hours"
                    name="estimatedHours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 4.5"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatePending}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-xs text-white"
                >
                  {isCreatePending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Create Task</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-lg space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <h2 className="text-text text-base font-bold">Edit Task</h2>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setUpdateError(null);
                }}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            {updateError && (
              <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{updateError}</p>
              </div>
            )}

            <form
              onSubmit={handleEditSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="taskId" value={editingTask.id} />

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-task-title"
                  className="text-text block text-xs font-semibold"
                >
                  Task Title *
                </label>
                <input
                  id="edit-task-title"
                  name="title"
                  type="text"
                  required
                  defaultValue={editingTask.title}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-task-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="edit-task-description"
                  name="description"
                  rows={3}
                  defaultValue={editingTask.description || ""}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-assignee"
                    className="text-text block text-xs font-semibold"
                  >
                    Assignee
                  </label>
                  <select
                    id="edit-task-assignee"
                    name="assigneeId"
                    defaultValue={editingTask.assignee?.id || ""}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {teams
                      .find((t) => t.id === editingTask.team.id)
                      ?.memberships.map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name || m.user.email}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-priority"
                    className="text-text block text-xs font-semibold"
                  >
                    Priority *
                  </label>
                  <select
                    id="edit-task-priority"
                    name="priority"
                    defaultValue={editingTask.priority}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-status"
                    className="text-text block text-xs font-semibold"
                  >
                    Status *
                  </label>
                  <select
                    id="edit-task-status"
                    name="status"
                    defaultValue={editingTask.status}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>
              </div>

              {/* Recurrence, Due Date & Estimate (PRD §6.5.10) Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-recurrence"
                    className="text-text block text-xs font-semibold"
                  >
                    Repeat / Recurrence
                  </label>
                  <select
                    id="edit-task-recurrence"
                    name="recurrence"
                    defaultValue={editingTask.recurrence || RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None (Does not repeat)</option>
                    <option value={RecurrenceRule.DAILY}>Daily (Every day)</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly (Every week)</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly (Every month)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-due-date"
                    className="text-text block text-xs font-semibold"
                  >
                    Due Date
                  </label>
                  <input
                    id="edit-task-due-date"
                    name="dueDate"
                    type="date"
                    defaultValue={
                      editingTask.dueDate
                        ? new Date(editingTask.dueDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-task-estimated-hours"
                    className="text-text block text-xs font-semibold"
                  >
                    Estimate (Hours)
                  </label>
                  <input
                    id="edit-task-estimated-hours"
                    name="estimatedHours"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={editingTask.estimatedHours ?? ""}
                    placeholder="e.g. 4.5"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTask(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatePending}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-xs text-white"
                >
                  {isUpdatePending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedDetailTask && (
        <TaskDetailModal
          task={selectedDetailTask}
          allTasks={initialTasks}
          teams={teams}
          currentUser={currentUser}
          onClose={() => setSelectedDetailTask(null)}
          onEdit={() => {
            const t = selectedDetailTask;
            setSelectedDetailTask(null);
            setEditingTask(t);
          }}
        />
      )}
    </div>
  );
}
