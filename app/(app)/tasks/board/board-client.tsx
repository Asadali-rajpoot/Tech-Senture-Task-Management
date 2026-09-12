"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedViewsBar, type TaskFilterState } from "@/components/tasks/saved-views-bar";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createTaskAction,
  updateTaskAction,
  updateTaskPositionAndStatusAction,
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
  LayoutList,
  Kanban,
  CalendarDays,
  GanttChartSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Edit,
  Trash2,
  X,
  Loader2,
  Clock,
  Inbox,
  GripVertical,
  CheckSquare,
  Link2,
  AlertTriangle,
  Repeat,
  MoreVertical,
  Check,
  ArrowUpDown,
  Users,
  FolderKanban,
} from "lucide-react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskItem, TeamWithMembers } from "../list/task-list-client";

interface BoardClientProps {
  initialTasks: TaskItem[];
  teams: TeamWithMembers[];
  currentUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    orgRole: OrgRole;
  };
}

const COLUMNS = [
  { id: TaskStatus.TODO, title: "To Do", color: "border-muted/40" },
  {
    id: TaskStatus.IN_PROGRESS,
    title: "In Progress",
    color: "border-warning/40",
  },
  { id: TaskStatus.DONE, title: "Done", color: "border-success/40" },
];

export function BoardClient({
  initialTasks,
  teams,
  currentUser,
}: BoardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search & Filter state synced with URL params
  const initialSearch = searchParams.get("search") || "";
  const initialPriority = searchParams.get("priority") || "ALL";
  const initialTeam = searchParams.get("team") || "ALL";
  const initialAssignee = searchParams.get("assignee") || "ALL";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [priorityFilter, setPriorityFilter] = useState<string>(initialPriority);
  const [teamFilter, setTeamFilter] = useState<string>(initialTeam);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(initialAssignee);

  const handleApplySavedView = (filters: TaskFilterState) => {
    setSearchQuery(filters.search || "");
    setPriorityFilter(filters.priority || "ALL");
    setTeamFilter(filters.teamId || "ALL");
    setAssigneeFilter(filters.assigneeId || "ALL");
  };

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createColumnStatus, setCreateColumnStatus] = useState<TaskStatus>(
    TaskStatus.TODO
  );
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

  const [, startTransition] = useTransition();
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

  // Sync state if initialTasks change
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Keyboard and menu-based fallback for moving tasks across columns and reordering (PRD §9 / Module 25)
  const handleMoveTask = (
    taskId: string,
    targetStatus: TaskStatus,
    direction?: "up" | "down"
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    let newPosition = task.position;

    if (targetStatus !== task.status) {
      newPosition =
        columnTasks.length === 0
          ? 1000
          : columnTasks[columnTasks.length - 1].position + 1000;
    } else if (direction === "up") {
      const sameColTasks = tasks
        .filter((t) => t.status === task.status)
        .sort((a, b) => a.position - b.position);
      const currIdx = sameColTasks.findIndex((t) => t.id === taskId);
      if (currIdx > 0) {
        const prevTask = sameColTasks[currIdx - 1];
        const prevPrevTask = sameColTasks[currIdx - 2];
        newPosition = prevPrevTask
          ? (prevPrevTask.position + prevTask.position) / 2
          : prevTask.position / 2;
      }
    } else if (direction === "down") {
      const sameColTasks = tasks
        .filter((t) => t.status === task.status)
        .sort((a, b) => a.position - b.position);
      const currIdx = sameColTasks.findIndex((t) => t.id === taskId);
      if (currIdx < sameColTasks.length - 1) {
        const nextTask = sameColTasks[currIdx + 1];
        const nextNextTask = sameColTasks[currIdx + 2];
        newPosition = nextNextTask
          ? (nextTask.position + nextNextTask.position) / 2
          : nextTask.position + 1000;
      }
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: targetStatus, position: newPosition }
          : t
      )
    );

    startTransition(async () => {
      const res = await updateTaskPositionAndStatusAction(
        taskId,
        targetStatus,
        newPosition
      );
      if (res.warning) {
        setWarningMessage(res.warning);
      }
    });
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const now = new Date();

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter === "ALL" || task.priority === priorityFilter;

    const matchesTeam = teamFilter === "ALL" || task.team.id === teamFilter;

    const matchesAssignee =
      assigneeFilter === "ALL"
        ? true
        : assigneeFilter === "UNASSIGNED"
          ? task.assignee === null
          : task.assignee?.id === assigneeFilter;

    return matchesSearch && matchesPriority && matchesTeam && matchesAssignee;
  });

  // Extract distinct assignees for filter
  const allAssignees = Array.from(
    new Map(
      teams
        .flatMap((t) => t.memberships.map((m) => m.user))
        .map((u) => [u.id, u])
    ).values()
  );

  const selectedTeamMembers =
    teams.find((t) => t.id === selectedCreateTeamId)?.memberships.map(
      (m) => m.user
    ) || [];

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Check if over is a column container
    const isOverColumn = COLUMNS.some((c) => c.id === overId);
    if (isOverColumn) {
      const targetStatus = overId as TaskStatus;
      if (activeTaskItem.status !== targetStatus) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: targetStatus } : t
          )
        );
      }
      return;
    }

    // Check if over is another task
    const overTaskItem = tasks.find((t) => t.id === overId);
    if (overTaskItem && activeTaskItem.status !== overTaskItem.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overTaskItem.status } : t
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find((t) => t.id === activeId);
    if (!task) return;

    let targetStatus: TaskStatus = task.status;
    let newPosition = task.position;

    const isOverColumn = COLUMNS.some((c) => c.id === overId);

    if (isOverColumn) {
      targetStatus = overId as TaskStatus;
      const columnTasks = tasks
        .filter((t) => t.status === targetStatus && t.id !== activeId)
        .sort((a, b) => a.position - b.position);

      if (columnTasks.length === 0) {
        newPosition = 1000;
      } else {
        newPosition = columnTasks[columnTasks.length - 1].position + 1000;
      }
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;

      targetStatus = overTask.status;
      const columnTasks = tasks
        .filter((t) => t.status === targetStatus && t.id !== activeId)
        .sort((a, b) => a.position - b.position);

      const overIndex = columnTasks.findIndex((t) => t.id === overId);

      if (overIndex === -1) {
        newPosition = 1000;
      } else if (overIndex === 0) {
        newPosition = columnTasks[0].position / 2;
      } else {
        const prevPos = columnTasks[overIndex - 1].position;
        const nextPos = columnTasks[overIndex].position;
        newPosition = (prevPos + nextPos) / 2;
      }
    }

    // Optimistically update state
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, status: targetStatus, position: newPosition }
          : t
      )
    );

    // Persist to database
    startTransition(async () => {
      const res = await updateTaskPositionAndStatusAction(
        activeId,
        targetStatus,
        newPosition
      );
      if (res.warning) {
        setWarningMessage(res.warning);
      }
    });
  };

  // Priority badge styling (PRD.md §7.2.1)
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

  const isOverdue = (dueDate: Date | string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.DONE) return false;
    return new Date(dueDate) < now;
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    priorityFilter !== "ALL" ||
    teamFilter !== "ALL" ||
    assigneeFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setTeamFilter("ALL");
    setAssigneeFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation View Switcher */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">Board</h1>
          <p className="text-muted text-xs sm:text-sm">
            Drag and drop task cards across status columns to update progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Tabs */}
          <div className="border-border bg-card flex items-center rounded-lg border p-1 shadow-xs">
            <Link
              href="/tasks/list"
              className="text-muted hover:text-text flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <LayoutList className="size-3.5" />
              <span>List</span>
            </Link>
            <Link
              href="/tasks/board"
              className="bg-primary text-white flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-xs"
            >
              <Kanban className="size-3.5" />
              <span>Board</span>
            </Link>
            <Link
              href="/tasks/calendar"
              className="text-muted hover:text-text flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <CalendarDays className="size-3.5" />
              <span>Calendar</span>
            </Link>
            <Link
              href="/tasks/timeline"
              className="text-muted hover:text-text flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <GanttChartSquare className="size-3.5" />
              <span>Timeline</span>
            </Link>
          </div>

          <Button
            onClick={() => {
              setCreateColumnStatus(TaskStatus.TODO);
              setIsCreateOpen(true);
            }}
            disabled={teams.length === 0}
            className="bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold text-white shadow-xs"
          >
            <Plus className="size-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-border bg-card space-y-3 rounded-xl border p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="border-border bg-background flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-xs lg:w-72">
            <Search className="text-muted size-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search board tasks..."
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

          <div className="flex flex-wrap items-center gap-2">
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
            priority: priorityFilter,
            teamId: teamFilter,
            assigneeId: assigneeFilter,
          }}
          onApplyView={handleApplySavedView}
        />
      </div>

      {/* Action Warning Alerts */}
      {warningMessage && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between rounded-lg border p-3.5 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0" />
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

      {/* Kanban Board Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks
              .filter((t) => t.status === column.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div
                key={column.id}
                className="border-border bg-card/60 flex min-h-[500px] flex-col rounded-2xl border p-4 shadow-xs"
              >
                {/* Column Header */}
                <div className="border-border mb-4 flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${
                        column.id === TaskStatus.TODO
                          ? "bg-muted"
                          : column.id === TaskStatus.IN_PROGRESS
                            ? "bg-primary"
                            : "bg-success"
                      }`}
                    />
                    <h2 className="text-text text-sm font-bold tracking-tight">
                      {column.title}
                    </h2>
                    <span className="border-border bg-background text-muted rounded-full border px-2 py-0.5 text-[11px] font-bold">
                      {columnTasks.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateColumnStatus(column.id);
                      setIsCreateOpen(true);
                    }}
                    className="text-muted hover:text-text size-7 p-0"
                    title={`Add task to ${column.title}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                {/* Sortable Tasks Container */}
                <SortableContext
                  id={column.id}
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    id={column.id}
                    className="flex-1 space-y-3"
                  >
                    {columnTasks.length === 0 ? (
                      /* Empty Column State (PRD.md §6.4.2 / §7.1) */
                      <div className="border-border/60 bg-background/40 flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                        <Inbox className="text-muted/40 size-8" />
                        <p className="text-muted mt-2 text-xs font-medium">
                          No tasks here
                        </p>
                        <button
                          onClick={() => {
                            setCreateColumnStatus(column.id);
                            setIsCreateOpen(true);
                          }}
                          className="text-primary hover:text-primary/80 mt-1 text-[11px] font-semibold"
                        >
                          + Add a task
                        </button>
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          isOverdue={isOverdue(task.dueDate, task.status)}
                          getPriorityBadge={getPriorityBadge}
                          onSelectDetail={() => setSelectedDetailTask(task)}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => handleDeleteTask(task.id, task.title)}
                          onMoveTask={handleMoveTask}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay for smooth card movement */}
        <DragOverlay>
          {activeTask ? (
            <div className="border-primary bg-card/95 rotate-2 scale-105 space-y-2.5 rounded-xl border-2 p-4 shadow-2xl backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-text text-xs font-semibold">
                  {activeTask.title}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${getPriorityBadge(
                    activeTask.priority
                  )}`}
                >
                  {activeTask.priority}
                </span>
              </div>
              <p className="text-muted text-[11px]">
                {activeTask.team.name} • {activeTask.team.project.name}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Detail Modal (Subtasks, Labels, Dependencies, Comments & Mentions) */}
      {selectedDetailTask && (
        <TaskDetailModal
          task={selectedDetailTask}
          allTasks={tasks}
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
              <h2 className="text-text text-base font-bold">
                Create Task ({COLUMNS.find((c) => c.id === createColumnStatus)?.title})
              </h2>
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
              <input type="hidden" name="status" value={createColumnStatus} />

              <div className="space-y-1.5">
                <label
                  htmlFor="board-task-team"
                  className="text-text block text-xs font-semibold"
                >
                  Team *
                </label>
                <select
                  id="board-task-team"
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

              <div className="space-y-1.5">
                <label
                  htmlFor="board-task-title"
                  className="text-text block text-xs font-semibold"
                >
                  Task Title *
                </label>
                <input
                  id="board-task-title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Design review for dashboard components"
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="board-task-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="board-task-description"
                  name="description"
                  rows={3}
                  placeholder="Task context or instructions..."
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="board-task-assignee"
                    className="text-text block text-xs font-semibold"
                  >
                    Assignee
                  </label>
                  <select
                    id="board-task-assignee"
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
                    htmlFor="board-task-priority"
                    className="text-text block text-xs font-semibold"
                  >
                    Priority *
                  </label>
                  <select
                    id="board-task-priority"
                    name="priority"
                    defaultValue={TaskPriority.MEDIUM}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="board-task-due-date"
                    className="text-text block text-xs font-semibold"
                  >
                    Due Date
                  </label>
                  <input
                    id="board-task-due-date"
                    name="dueDate"
                    type="date"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="board-task-recurrence"
                    className="text-text block text-xs font-semibold"
                  >
                    Recurrence
                  </label>
                  <select
                    id="board-task-recurrence"
                    name="recurrence"
                    defaultValue={RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None (Single)</option>
                    <option value={RecurrenceRule.DAILY}>Daily</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="board-task-estimated-hours"
                    className="text-text block text-xs font-semibold"
                  >
                    Estimate (Hours)
                  </label>
                  <input
                    id="board-task-estimated-hours"
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
                  htmlFor="edit-board-title"
                  className="text-text block text-xs font-semibold"
                >
                  Task Title *
                </label>
                <input
                  id="edit-board-title"
                  name="title"
                  type="text"
                  required
                  defaultValue={editingTask.title}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-board-desc"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="edit-board-desc"
                  name="description"
                  rows={3}
                  defaultValue={editingTask.description || ""}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-board-assignee"
                    className="text-text block text-xs font-semibold"
                  >
                    Assignee
                  </label>
                  <select
                    id="edit-board-assignee"
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
                    htmlFor="edit-board-priority"
                    className="text-text block text-xs font-semibold"
                  >
                    Priority *
                  </label>
                  <select
                    id="edit-board-priority"
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
                    htmlFor="edit-board-status"
                    className="text-text block text-xs font-semibold"
                  >
                    Status *
                  </label>
                  <select
                    id="edit-board-status"
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-board-due-date"
                    className="text-text block text-xs font-semibold"
                  >
                    Due Date
                  </label>
                  <input
                    id="edit-board-due-date"
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
                    htmlFor="edit-board-recurrence"
                    className="text-text block text-xs font-semibold"
                  >
                    Recurrence
                  </label>
                  <select
                    id="edit-board-recurrence"
                    name="recurrence"
                    defaultValue={editingTask.recurrence || RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None (Single)</option>
                    <option value={RecurrenceRule.DAILY}>Daily</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-board-estimated-hours"
                    className="text-text block text-xs font-semibold"
                  >
                    Estimate (Hours)
                  </label>
                  <input
                    id="edit-board-estimated-hours"
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
    </div>
  );
}

/**
 * Sortable Individual Task Card
 */
function SortableTaskCard({
  task,
  isOverdue,
  getPriorityBadge,
  onSelectDetail,
  onEdit,
  onDelete,
  onMoveTask,
}: {
  task: TaskItem;
  isOverdue: boolean;
  getPriorityBadge: (priority: TaskPriority) => string;
  onSelectDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveTask?: (taskId: string, targetStatus: TaskStatus, direction?: "up" | "down") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const completedSubtasks = (task.subtasks || []).filter(
    (s) => s.isCompleted
  ).length;
  const totalSubtasks = task.subtasks?.length || task._count?.subtasks || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border-border bg-card hover:border-primary/50 group relative space-y-3 rounded-xl border p-3.5 shadow-xs transition-all ${
        isDragging ? "ring-primary z-50 ring-2 shadow-lg" : ""
      }`}
    >
      {/* Top Drag Handle & Quick Badges Header */}
      <div className="flex items-center justify-between gap-2">
        <div
          {...listeners}
          className="text-muted hover:text-text cursor-grab active:cursor-grabbing"
          title="Drag to reorder or change status"
        >
          <GripVertical className="size-3.5" />
        </div>

        <div className="flex items-center gap-1.5">
          {/* Accessible Keyboard Move Menu (PRD §9 / Module 25) */}
          {onMoveTask && (
            <select
              aria-label={`Move task ${task.title}`}
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                if (val === "UP") {
                  onMoveTask(task.id, task.status, "up");
                } else if (val === "DOWN") {
                  onMoveTask(task.id, task.status, "down");
                } else if (
                  val === TaskStatus.TODO ||
                  val === TaskStatus.IN_PROGRESS ||
                  val === TaskStatus.DONE
                ) {
                  onMoveTask(task.id, val as TaskStatus);
                }
                e.target.value = "";
              }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 border-border bg-background text-muted hover:text-text text-[10px] rounded border px-1 py-0.2 transition-opacity focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                Move...
              </option>
              {task.status !== TaskStatus.TODO && (
                <option value={TaskStatus.TODO}>Move to To Do</option>
              )}
              {task.status !== TaskStatus.IN_PROGRESS && (
                <option value={TaskStatus.IN_PROGRESS}>Move to In Progress</option>
              )}
              {task.status !== TaskStatus.DONE && (
                <option value={TaskStatus.DONE}>Move to Done</option>
              )}
              <option value="UP">Move Up ↑</option>
              <option value="DOWN">Move Down ↓</option>
            </select>
          )}

          <span
            className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${getPriorityBadge(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Title & Description Snippet */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={onSelectDetail}
          className="text-text group-hover:text-primary text-left text-xs font-bold leading-snug transition-colors hover:underline"
        >
          {task.title}
        </button>
        {task.description && (
          <p className="text-muted line-clamp-2 text-[11px] leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Labels & Subtask Progress Badges */}
      {((task.labels && task.labels.length > 0) || totalSubtasks > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {task.labels?.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold text-white shadow-2xs"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}

          {totalSubtasks > 0 && (
            <span className="border-border bg-background text-muted inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[9px] font-semibold">
              <CheckSquare className="size-2.5" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}

          {task.dependencies && task.dependencies.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[9px] font-semibold ${
                task.dependencies.some(
                  (d) => d.dependsOnTask.status !== TaskStatus.DONE
                )
                  ? "border-warning/30 bg-warning/15 text-warning"
                  : "border-border bg-background text-muted"
              }`}
              title={`${task.dependencies.length} prerequisite${task.dependencies.length > 1 ? "s" : ""}`}
            >
              <Link2 className="size-2.5" />
              <span>
                {task.dependencies.length}{" "}
                {task.dependencies.length === 1 ? "dep" : "deps"}
              </span>
            </span>
          )}

          {task.recurrence && task.recurrence !== RecurrenceRule.NONE && (
            <span
              className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded border px-1.5 py-0.2 text-[9px] font-semibold"
              title={`Recurring: ${task.recurrence.toLowerCase()}`}
            >
              <Repeat className="size-2.5" />
              <span>{task.recurrence.toLowerCase()}</span>
            </span>
          )}
        </div>
      )}

      {/* Due Date, Overdue Tag & Time Indicator */}
      {(task.dueDate || task.estimatedHours != null || ((task.timeEntries?.length || 0) > 0)) && (
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {task.dueDate && (
            <div
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                isOverdue
                  ? "border-danger/30 bg-danger/10 text-danger border"
                  : "text-muted"
              }`}
            >
              <Calendar className="size-3" />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isOverdue && (
                <span className="bg-danger text-[9px] font-bold text-white px-1 py-0.2 rounded-xs ml-0.5">
                  Overdue
                </span>
              )}
            </div>
          )}

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
                  className="flex items-center gap-1 text-muted font-medium"
                  title={`Logged: ${totalLoggedHours}h ${task.estimatedHours != null ? `| Estimated: ${task.estimatedHours}h` : ""}`}
                >
                  <Clock className="size-3 shrink-0" />
                  <span>
                    {totalLoggedMinutes > 0 ? `${totalLoggedHours}h` : "0h"}
                    {task.estimatedHours != null ? ` / ${task.estimatedHours}h` : ""}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Card Footer: Assignee & Action Buttons */}
      <div className="border-border/60 flex items-center justify-between border-t pt-2.5 text-xs">
        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          <div
            title={
              task.assignee
                ? `Assigned to ${task.assignee.name || task.assignee.email}`
                : "Unassigned"
            }
            className="bg-primary/10 text-primary flex size-5.5 items-center justify-center rounded-full text-[10px] font-bold"
          >
            {task.assignee
              ? (task.assignee.name?.[0] || task.assignee.email?.[0] || "U").toUpperCase()
              : "—"}
          </div>
          <span className="text-muted truncate text-[10px]">
            {task.assignee ? task.assignee.name || task.assignee.email : "Unassigned"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectDetail}
            className="text-muted hover:text-text size-6 p-0"
            title="View details & subtasks"
          >
            <CheckSquare className="size-3" />
            <span className="sr-only">Details</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-muted hover:text-text size-6 p-0"
            title="Edit task"
          >
            <Edit className="size-3" />
            <span className="sr-only">Edit</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-danger hover:text-danger hover:bg-danger/10 size-6 p-0"
            title="Delete task"
          >
            <Trash2 className="size-3" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
