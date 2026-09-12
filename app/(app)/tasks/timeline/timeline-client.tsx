"use client";

import React, { useState, useTransition, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedViewsBar, type TaskFilterState } from "@/components/tasks/saved-views-bar";
import {
  createTaskAction,
  updateTaskAction,
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
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutList,
  Kanban,
  CalendarDays,
  GanttChartSquare,
  X,
  Loader2,
  Edit,
  Trash2,
  CheckSquare,
  Repeat,
  Info,
  Layers,
  Sparkles,
  Milestone,
} from "lucide-react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskItem, TeamWithMembers } from "../list/task-list-client";

interface TimelineClientProps {
  initialTasks: TaskItem[];
  teams: TeamWithMembers[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

type TimelineZoom = "day" | "week" | "month";

export function TimelineClient({
  initialTasks,
  teams,
  currentUser,
}: TimelineClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialTeam = searchParams.get("team") || "ALL";
  const initialStatus = (searchParams.get("status") as TaskStatus) || "ALL";
  const initialPriority = (searchParams.get("priority") as TaskPriority) || "ALL";
  const initialAssignee = searchParams.get("assignee") || "ALL";

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  // Time window state
  const [zoomLevel, setZoomLevel] = useState<TimelineZoom>("day");
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default window: 1 week before today
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [teamFilter, setTeamFilter] = useState(initialTeam);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">(initialPriority);
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssignee);

  const handleApplySavedView = (filters: TaskFilterState) => {
    setSearch(filters.search || "");
    if (filters.teamId) setTeamFilter(filters.teamId);
    if (filters.status) setStatusFilter(filters.status as TaskStatus | "ALL");
    if (filters.priority) setPriorityFilter(filters.priority as TaskPriority | "ALL");
    if (filters.assigneeId) setAssigneeFilter(filters.assigneeId);
  };

  // Selected task for detail modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Create task modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCreateTeamId, setSelectedCreateTeamId] = useState<string>(
    teams[0]?.id || ""
  );
  const [isPendingCreate, startTransitionCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit task modal state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isPendingEdit, startTransitionEdit] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);

  // Delete task modal state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isPendingDelete, startTransitionDelete] = useTransition();

  // Unscheduled drawer toggle
  const [showUnscheduledModal, setShowUnscheduledModal] = useState(false);

  // Timeline canvas ref for horizontal scrolling
  const timelineCanvasRef = useRef<HTMLDivElement>(null);

  // Day width in pixels based on zoom level
  const dayWidth = zoomLevel === "day" ? 44 : zoomLevel === "week" ? 22 : 12;
  const totalDays = zoomLevel === "day" ? 45 : zoomLevel === "week" ? 90 : 180;

  // Generate continuous days for current timeline window
  const timelineDays = useMemo(() => {
    const days: { date: Date; dateKey: string; isToday: boolean; isWeekend: boolean }[] = [];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(timelineStart);
      d.setDate(timelineStart.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        dateKey,
        isToday: dateKey === todayKey,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return days;
  }, [timelineStart, totalDays]);

  // Window shift helpers
  const shiftTimeline = (offsetDays: number) => {
    setTimelineStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offsetDays);
      return next;
    });
  };

  const jumpToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    setTimelineStart(d);
  };

  // Extract all unique assignees across teams
  const allAssignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string | null; email: string | null }>();
    teams.forEach((t) => {
      t.memberships.forEach((m) => {
        if (!map.has(m.user.id)) {
          map.set(m.user.id, m.user);
        }
      });
    });
    return Array.from(map.values());
  }, [teams]);

  // Filter tasks based on criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query) ?? false;
        if (!matchTitle && !matchDesc) return false;
      }
      // Team
      if (teamFilter !== "ALL" && t.team.id !== teamFilter) {
        return false;
      }
      // Status
      if (statusFilter !== "ALL" && t.status !== statusFilter) {
        return false;
      }
      // Priority
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) {
        return false;
      }
      // Assignee
      if (assigneeFilter !== "ALL") {
        if (assigneeFilter === "UNASSIGNED") {
          if (t.assignee) return false;
        } else if (t.assignee?.id !== assigneeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, search, teamFilter, statusFilter, priorityFilter, assigneeFilter]);

  // Group tasks by timeline readiness:
  // - tasks with both start and due date (duration bar)
  // - tasks with single date (point marker)
  // - tasks with no date (unscheduled)
  const { barTasks, pointTasks, unscheduledTasks } = useMemo(() => {
    const bars: TaskItem[] = [];
    const points: TaskItem[] = [];
    const unscheduled: TaskItem[] = [];

    filteredTasks.forEach((task) => {
      if (task.startDate && task.dueDate) {
        bars.push(task);
      } else if (task.startDate || task.dueDate) {
        points.push(task);
      } else {
        unscheduled.push(task);
      }
    });

    return { barTasks: bars, pointTasks: points, unscheduledTasks: unscheduled };
  }, [filteredTasks]);

  // Combined timeline tasks (bars + point markers)
  const timelineTasks = useMemo(() => {
    return [...barTasks, ...pointTasks];
  }, [barTasks, pointTasks]);

  // Timeline coordinate calculator
  const calculateTaskCoordinates = (task: TaskItem) => {
    const windowStartMs = timelineStart.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const start = task.startDate ? new Date(task.startDate).getTime() : null;
    const end = task.dueDate ? new Date(task.dueDate).getTime() : null;

    if (start && end) {
      // Duration bar
      const leftDays = (Math.min(start, end) - windowStartMs) / dayMs;
      const durationDays = Math.max(1, Math.abs(end - start) / dayMs + 1);

      const leftPx = leftDays * dayWidth;
      const widthPx = durationDays * dayWidth;

      return { type: "bar" as const, leftPx, widthPx };
    } else if (end) {
      // Due date point marker
      const leftDays = (end - windowStartMs) / dayMs;
      const leftPx = leftDays * dayWidth + dayWidth / 2 - 8;
      return { type: "point" as const, leftPx, markerDate: new Date(end) };
    } else if (start) {
      // Start date point marker
      const leftDays = (start - windowStartMs) / dayMs;
      const leftPx = leftDays * dayWidth + dayWidth / 2 - 8;
      return { type: "point" as const, leftPx, markerDate: new Date(start) };
    }

    return null;
  };

  // Helper for priority styling
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return {
          bg: "bg-red-500",
          border: "border-red-500",
          text: "text-red-500",
          label: "High",
        };
      case TaskPriority.MEDIUM:
        return {
          bg: "bg-amber-500",
          border: "border-amber-500",
          text: "text-amber-500",
          label: "Medium",
        };
      case TaskPriority.LOW:
      default:
        return {
          bg: "bg-slate-400",
          border: "border-slate-400",
          text: "text-slate-400",
          label: "Low",
        };
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return {
          barBg: "bg-success text-white shadow-xs",
          label: "Done",
          icon: <CheckCircle2 className="size-3 text-success shrink-0" />,
        };
      case TaskStatus.IN_PROGRESS:
        return {
          barBg: "bg-secondary text-white shadow-xs",
          label: "In Progress",
          icon: <Clock className="size-3 text-secondary shrink-0" />,
        };
      case TaskStatus.TODO:
      default:
        return {
          barBg: "bg-primary/80 text-white shadow-xs",
          label: "To Do",
          icon: <div className="size-2 rounded-full border border-muted bg-transparent shrink-0" />,
        };
    }
  };

  // Handle task creation
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);

    startTransitionCreate(async () => {
      const res = await createTaskAction({}, formData);
      if (res.error) {
        setCreateError(res.error);
      } else {
        setIsCreateOpen(false);
        router.refresh();
      }
    });
  };

  // Handle task edit
  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTask) return;
    setEditError(null);
    const formData = new FormData(e.currentTarget);
    formData.append("id", editingTask.id);

    startTransitionEdit(async () => {
      const res = await updateTaskAction({}, formData);
      if (res.error) {
        setEditError(res.error);
      } else {
        setEditingTask(null);
        router.refresh();
      }
    });
  };

  // Handle task deletion
  const handleDeleteConfirm = () => {
    if (!deletingTaskId) return;
    const formData = new FormData();
    formData.append("id", deletingTaskId);

    startTransitionDelete(async () => {
      const res = await deleteTaskAction({}, formData);
      if (!res.error) {
        setTasks((prev) => prev.filter((t) => t.id !== deletingTaskId));
        if (selectedTask?.id === deletingTaskId) {
          setSelectedTask(null);
        }
        setDeletingTaskId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GanttChartSquare className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-text">Timeline</h1>
          </div>
          <p className="text-xs text-muted">
            Visualize project schedule, durations, and milestone deadlines on a horizontal roadmap.
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
              className="text-muted hover:text-text flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
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
              className="bg-primary text-white flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-xs"
            >
              <GanttChartSquare className="size-3.5" />
              <span>Timeline</span>
            </Link>
          </div>

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

      {/* Filter and Navigation Toolbar */}
      <div className="border-border bg-card flex flex-col gap-3.5 rounded-xl border p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Timeline Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 border-border rounded-lg border bg-background p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftTimeline(zoomLevel === "day" ? -14 : -30)}
                aria-label="Shift left"
                className="h-7 w-7 p-0 text-muted hover:text-text"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={jumpToToday}
                className="h-7 px-2 text-xs font-semibold text-text hover:bg-muted/10"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => shiftTimeline(zoomLevel === "day" ? 14 : 30)}
                aria-label="Shift right"
                className="h-7 w-7 p-0 text-muted hover:text-text"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {/* Zoom / Scale Level */}
            <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                onClick={() => setZoomLevel("day")}
                className={`rounded px-2.5 py-1 font-medium transition-all ${
                  zoomLevel === "day"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "text-muted hover:text-text"
                }`}
              >
                Days
              </button>
              <button
                onClick={() => setZoomLevel("week")}
                className={`rounded px-2.5 py-1 font-medium transition-all ${
                  zoomLevel === "week"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "text-muted hover:text-text"
                }`}
              >
                Weeks
              </button>
              <button
                onClick={() => setZoomLevel("month")}
                className={`rounded px-2.5 py-1 font-medium transition-all ${
                  zoomLevel === "month"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "text-muted hover:text-text"
                }`}
              >
                Months
              </button>
            </div>

            <div className="text-xs text-muted pl-1 font-medium">
              Window: {timelineDays[0]?.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} — {timelineDays[timelineDays.length - 1]?.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Stats summary & Unscheduled toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnscheduledModal(true)}
              className="text-muted hover:text-text hover:bg-muted/10 flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs transition-colors"
            >
              <Info className="size-3.5 text-primary" />
              <span>
                <strong>{unscheduledTasks.length}</strong> unscheduled
              </span>
            </button>
            <div className="text-xs text-muted">
              <strong>{barTasks.length}</strong> duration bars • <strong>{pointTasks.length}</strong> milestones
            </div>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/50">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search timeline tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-background placeholder:text-muted/60 focus:border-primary focus:ring-primary/20 h-8.5 w-full rounded-lg border pr-3 pl-9 text-xs focus:ring-2 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted hover:text-text absolute top-1/2 right-2.5 -translate-y-1/2"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Team Filter */}
          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 h-8.5 appearance-none rounded-lg border pr-8 pl-3 text-xs focus:ring-2 focus:outline-none"
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.project.name})
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "ALL")}
              className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 h-8.5 appearance-none rounded-lg border pr-8 pl-3 text-xs focus:ring-2 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.DONE}>Done</option>
            </select>
            <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "ALL")}
              className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 h-8.5 appearance-none rounded-lg border pr-8 pl-3 text-xs focus:ring-2 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.LOW}>Low</option>
            </select>
            <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>

          {/* Assignee Filter */}
          <div className="relative">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 h-8.5 appearance-none rounded-lg border pr-8 pl-3 text-xs focus:ring-2 focus:outline-none"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {allAssignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>

          {/* Clear Filters */}
          {(search || teamFilter !== "ALL" || statusFilter !== "ALL" || priorityFilter !== "ALL" || assigneeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setTeamFilter("ALL");
                setStatusFilter("ALL");
                setPriorityFilter("ALL");
                setAssigneeFilter("ALL");
              }}
              className="h-8.5 text-xs text-muted hover:text-text"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Saved Views Quick Access Bar */}
        <SavedViewsBar
          currentFilters={{
            search,
            status: statusFilter,
            priority: priorityFilter,
            teamId: teamFilter,
            assigneeId: assigneeFilter,
          }}
          onApplyView={handleApplySavedView}
        />
      </div>

      {/* Main Timeline Canvas */}
      <div className="border-border bg-card rounded-xl border shadow-xs overflow-hidden flex flex-col">
        <div className="flex divide-x divide-border">
          {/* Left Table: Task Metadata Column */}
          <div className="w-[280px] sm:w-[340px] shrink-0 flex flex-col bg-card border-r border-border">
            {/* Table Header */}
            <div className="h-14 border-b border-border bg-muted/20 px-4 flex items-center justify-between text-xs font-semibold text-muted">
              <span>Task & Assignee</span>
              <span>Dates</span>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-border">
              {timelineTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted">
                  No scheduled timeline tasks found.
                </div>
              ) : (
                timelineTasks.map((task) => {
                  const pStyle = getPriorityBadge(task.priority);
                  const sStyle = getStatusBadge(task.status);
                  const isBar = task.startDate && task.dueDate;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="h-12 px-4 flex items-center justify-between gap-2 hover:bg-muted/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {sStyle.icon}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-text leading-tight">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted">
                            <span className="truncate max-w-[90px]">{task.team.name}</span>
                            {task.assignee && (
                              <span>• {task.assignee.name || task.assignee.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isBar ? (
                          <span className="text-[10px] text-muted font-medium bg-muted/20 px-1.5 py-0.5 rounded">
                            {new Date(task.startDate!).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })} — {new Date(task.dueDate!).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </span>
                        ) : task.dueDate ? (
                          <span className="text-[10px] text-primary font-semibold flex items-center gap-1">
                            <Milestone className="size-2.5" />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </span>
                        ) : task.startDate ? (
                          <span className="text-[10px] text-secondary font-semibold flex items-center gap-1">
                            <Milestone className="size-2.5" />
                            {new Date(task.startDate).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Area: Scrollable Horizontal Timeline Grid */}
          <div
            ref={timelineCanvasRef}
            className="flex-1 overflow-x-auto relative bg-background/50"
          >
            {/* Timeline Header Row (Dates) */}
            <div
              className="h-14 border-b border-border bg-muted/20 flex divide-x divide-border/60 sticky top-0 z-10"
              style={{ width: `${totalDays * dayWidth}px` }}
            >
              {timelineDays.map((d) => (
                <div
                  key={d.dateKey}
                  style={{ width: `${dayWidth}px` }}
                  className={`shrink-0 flex flex-col items-center justify-center text-[10px] transition-colors ${
                    d.isToday
                      ? "bg-primary/10 text-primary font-bold"
                      : d.isWeekend
                      ? "bg-muted/15 text-muted/60"
                      : "text-muted"
                  }`}
                >
                  <span className="uppercase text-[9px] font-semibold">
                    {d.date.toLocaleString("default", { weekday: "narrow" })}
                  </span>
                  <span className="text-[11px] font-bold">{d.date.getDate()}</span>
                  {d.date.getDate() === 1 && (
                    <span className="text-[8px] font-extrabold text-primary uppercase">
                      {d.date.toLocaleString("default", { month: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline Tracks Rows */}
            <div
              className="divide-y divide-border relative"
              style={{ width: `${totalDays * dayWidth}px` }}
            >
              {/* Vertical Day Grid Lines */}
              <div className="absolute inset-0 flex pointer-events-none divide-x divide-border/40">
                {timelineDays.map((d) => (
                  <div
                    key={d.dateKey}
                    style={{ width: `${dayWidth}px` }}
                    className={`shrink-0 h-full ${
                      d.isToday ? "bg-primary/[0.04] border-x border-primary/30" : d.isWeekend ? "bg-muted/[0.03]" : ""
                    }`}
                  />
                ))}
              </div>

              {/* Task Bars & Point Markers */}
              {timelineTasks.map((task) => {
                const coords = calculateTaskCoordinates(task);
                const sStyle = getStatusBadge(task.status);
                const pStyle = getPriorityBadge(task.priority);

                return (
                  <div key={task.id} className="h-12 relative flex items-center">
                    {coords && coords.type === "bar" && (
                      <div
                        onClick={() => setSelectedTask(task)}
                        role="button"
                        tabIndex={0}
                        title={`${task.title} (${task.status})`}
                        style={{
                          left: `${coords.leftPx}px`,
                          width: `${Math.max(coords.widthPx, 24)}px`,
                        }}
                        className={`absolute h-7 rounded-md ${sStyle.barBg} border border-white/20 hover:brightness-110 cursor-pointer shadow-xs flex items-center px-2 text-xs font-semibold truncate transition-all hover:scale-[1.01] hover:z-20`}
                      >
                        <div className={`size-1.5 rounded-full mr-1.5 shrink-0 ${pStyle.bg}`} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    )}

                    {coords && coords.type === "point" && (
                      <div
                        onClick={() => setSelectedTask(task)}
                        role="button"
                        tabIndex={0}
                        title={`${task.title} (Milestone: ${coords.markerDate.toLocaleDateString()})`}
                        style={{
                          left: `${coords.leftPx}px`,
                        }}
                        className={`absolute size-6 rounded-md bg-card border-2 ${pStyle.border} text-text hover:bg-muted/10 cursor-pointer shadow-sm flex items-center justify-center transition-all hover:scale-115 hover:z-20`}
                      >
                        <Milestone className={`size-3.5 ${pStyle.text}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled Tasks Drawer / Modal */}
      {showUnscheduledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="border-border bg-card w-full max-w-lg rounded-xl border p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-text flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  Unscheduled Tasks ({unscheduledTasks.length})
                </h3>
                <p className="text-xs text-muted">
                  These tasks lack a start and end date and are omitted from the timeline grid until scheduled.
                </p>
              </div>
              <button
                onClick={() => setShowUnscheduledModal(false)}
                className="text-muted hover:text-text rounded-md p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {unscheduledTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  All current tasks have start or due dates assigned!
                </div>
              ) : (
                unscheduledTasks.map((task) => {
                  const sStyle = getStatusBadge(task.status);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setShowUnscheduledModal(false);
                        setSelectedTask(task);
                      }}
                      className="border-border bg-background hover:bg-muted/10 cursor-pointer rounded-lg border p-3 transition-all flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-text">{task.title}</h4>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                          <span>{task.team.name}</span>
                          <span>• {task.assignee ? task.assignee.name || task.assignee.email : "Unassigned"}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowUnscheduledModal(false);
                          setEditingTask(task);
                        }}
                        className="text-xs gap-1"
                      >
                        <CalendarIcon className="size-3" />
                        <span>Set Dates</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnscheduledModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          teams={teams}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onEdit={() => {
            const t = selectedTask;
            setSelectedTask(null);
            setEditingTask(t);
          }}
        />
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-lg rounded-xl border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">Create New Task</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-text rounded-md p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {createError && (
              <div className="bg-danger/10 border-danger/30 text-danger rounded-lg border p-3 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text">Task Title *</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Infrastructure migration"
                  className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Task context, requirements, acceptance criteria..."
                  className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1 w-full rounded-lg border p-3 text-xs focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Team *</label>
                  <select
                    name="teamId"
                    required
                    value={selectedCreateTeamId}
                    onChange={(e) => setSelectedCreateTeamId(e.target.value)}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.project.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Assignee</label>
                  <select
                    name="assigneeId"
                    defaultValue=""
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {allAssignees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Priority</label>
                  <select
                    name="priority"
                    defaultValue={TaskPriority.MEDIUM}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Status</label>
                  <select
                    name="status"
                    defaultValue={TaskStatus.TODO}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Recurrence</label>
                  <select
                    name="recurrence"
                    defaultValue={RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None</option>
                    <option value={RecurrenceRule.DAILY}>Daily</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly</option>
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date for Timeline bar rendering */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPendingCreate}
                  className="bg-primary hover:bg-primary/90 text-xs font-semibold text-white"
                >
                  {isPendingCreate ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-lg rounded-xl border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-text">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-muted hover:text-text rounded-md p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            {editError && (
              <div className="bg-danger/10 border-danger/30 text-danger rounded-lg border p-3 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text">Task Title *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingTask.title}
                  className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingTask.description || ""}
                  className="border-border bg-background focus:border-primary focus:ring-primary/20 mt-1 w-full rounded-lg border p-3 text-xs focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Team *</label>
                  <select
                    name="teamId"
                    required
                    defaultValue={editingTask.team.id}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.project.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Assignee</label>
                  <select
                    name="assigneeId"
                    defaultValue={editingTask.assignee?.id || ""}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {allAssignees.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Priority</label>
                  <select
                    name="priority"
                    defaultValue={editingTask.priority}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Status</label>
                  <select
                    name="status"
                    defaultValue={editingTask.status}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.DONE}>Done</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Recurrence</label>
                  <select
                    name="recurrence"
                    defaultValue={editingTask.recurrence || RecurrenceRule.NONE}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={RecurrenceRule.NONE}>None</option>
                    <option value={RecurrenceRule.DAILY}>Daily</option>
                    <option value={RecurrenceRule.WEEKLY}>Weekly</option>
                    <option value={RecurrenceRule.MONTHLY}>Monthly</option>
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date for Timeline editing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={
                      editingTask.startDate
                        ? new Date(editingTask.startDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={
                      editingTask.dueDate
                        ? new Date(editingTask.dueDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTask(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPendingEdit}
                  className="bg-primary hover:bg-primary/90 text-xs font-semibold text-white"
                >
                  {isPendingEdit ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-danger">
              <div className="bg-danger/10 rounded-full p-2">
                <Trash2 className="size-5" />
              </div>
              <h3 className="text-base font-bold text-text">Delete Task</h3>
            </div>
            <p className="text-xs text-muted">
              Are you sure you want to permanently delete this task? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingTaskId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPendingDelete}
                onClick={handleDeleteConfirm}
                className="text-xs font-semibold"
              >
                {isPendingDelete ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Delete Task"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
