"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedViewsBar, type TaskFilterState } from "@/components/tasks/saved-views-bar";
import { TaskViewSwitcher } from "@/components/tasks/task-view-switcher";
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
} from "lucide-react";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { TaskItem, TeamWithMembers } from "../list/task-list-client";

interface CalendarClientProps {
  initialTasks: TaskItem[];
  teams: TeamWithMembers[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarClient({
  initialTasks,
  teams,
  currentUser,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialTeam = searchParams.get("team") || "ALL";
  const initialStatus = (searchParams.get("status") as TaskStatus) || "ALL";
  const initialPriority = (searchParams.get("priority") as TaskPriority) || "ALL";
  const initialAssignee = searchParams.get("assignee") || "ALL";

  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  // Current calendar month view state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

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

  // Selected task for detail view modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Create task modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<string>("");
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

  // Day overflow expanded popover
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

  // Unscheduled tasks drawer / modal toggle
  const [showUnscheduledModal, setShowUnscheduledModal] = useState(false);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

  // Selected team members for Create modal
  const createTeamMembers = useMemo(() => {
    const t = teams.find((item) => item.id === selectedCreateTeamId);
    return t ? t.memberships.map((m) => m.user) : [];
  }, [teams, selectedCreateTeamId]);

  // Filter tasks based on search & filter criteria
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

  // Separate tasks with due date from unscheduled tasks (per PRD §6.4.3 acceptance criteria)
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: TaskItem[] = [];
    const unscheduled: TaskItem[] = [];

    filteredTasks.forEach((task) => {
      if (task.dueDate) {
        scheduled.push(task);
      } else {
        unscheduled.push(task);
      }
    });

    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [filteredTasks]);

  // Map scheduled tasks by "YYYY-MM-DD" formatted date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();

    scheduledTasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(task);
    });

    return map;
  }, [scheduledTasks]);

  // Build the 7x5 or 7x6 month grid days
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: {
      date: Date;
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Leading days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        date: d,
        dateKey,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }

    // Days of the current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: d,
        dateKey,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
      });
    }

    // Trailing days from next month to complete standard grid rows (multiple of 7)
    const remainingDays = (7 - (days.length % 7)) % 7;
    const targetTotal = days.length + remainingDays < 35 ? 35 - days.length : remainingDays;

    for (let i = 1; i <= targetTotal; i++) {
      const d = new Date(year, month + 1, i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        date: d,
        dateKey,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
      });
    }

    return days;
  }, [year, month]);

  // Open Create modal with prefilled due date
  const handleOpenCreateForDate = (dateKey: string) => {
    setCreateDefaultDate(dateKey);
    setIsCreateOpen(true);
  };

  // Helper for priority styling (PRD §7.2.1)
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return {
          dot: "bg-red-500",
          border: "border-l-red-500",
          label: "High",
        };
      case TaskPriority.MEDIUM:
        return {
          dot: "bg-amber-500",
          border: "border-l-amber-500",
          label: "Medium",
        };
      case TaskPriority.LOW:
      default:
        return {
          dot: "bg-slate-400",
          border: "border-l-slate-400",
          label: "Low",
        };
    }
  };

  // Helper for status styling
  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE:
        return {
          label: "Done",
          icon: <CheckCircle2 className="size-3 text-success shrink-0" />,
          bg: "bg-success/10 text-success",
        };
      case TaskStatus.IN_PROGRESS:
        return {
          label: "In Progress",
          icon: <Clock className="size-3 text-secondary shrink-0" />,
          bg: "bg-secondary/10 text-secondary",
        };
      case TaskStatus.TODO:
      default:
        return {
          label: "To Do",
          icon: <div className="size-2 rounded-full border border-muted bg-transparent shrink-0" />,
          bg: "bg-muted/10 text-muted",
        };
    }
  };

  const isOverdue = (dueDate: Date | string | null, status: TaskStatus) => {
    if (!dueDate || status === TaskStatus.DONE) return false;
    const now = new Date();
    return new Date(dueDate) < now;
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
            <CalendarDays className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-text">Calendar</h1>
          </div>
          <p className="text-xs text-muted">
            Track milestones, deliverables, and scheduled deadlines by due date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Tabs */}
          <TaskViewSwitcher currentView="calendar" />

          <Button
            onClick={() => {
              setCreateDefaultDate("");
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
        {/* Top bar: Month Navigator & Quick Month Info */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text min-w-[180px]">{monthName}</h2>
            <div className="flex items-center gap-1 border-border rounded-lg border bg-background p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                aria-label="Previous month"
                className="h-7 w-7 p-0 text-muted hover:text-text"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="h-7 px-2 text-xs font-semibold text-text hover:bg-muted/10"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                aria-label="Next month"
                className="h-7 w-7 p-0 text-muted hover:text-text"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Unscheduled tasks badge / toggle per PRD §6.4.3 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnscheduledModal(true)}
              className="text-muted hover:text-text hover:bg-muted/10 flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs transition-colors"
            >
              <Info className="size-3.5 text-primary" />
              <span>
                <strong>{unscheduledTasks.length}</strong> unscheduled tasks
              </span>
            </button>
            <div className="text-xs text-muted">
              <strong>{scheduledTasks.length}</strong> scheduled
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
              placeholder="Search scheduled tasks..."
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

      {/* Calendar Grid Container */}
      <div className="border-border bg-card rounded-xl border shadow-xs overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/20 text-center text-xs font-semibold text-muted">
          {DAYS_OF_WEEK.map((d, idx) => (
            <div
              key={d}
              className={`py-2.5 uppercase tracking-wider ${
                idx === 0 || idx === 6 ? "text-muted/70" : "text-text/80"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Month day cells grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border bg-border/40">
          {calendarGrid.map((day) => {
            const dayTasks = tasksByDate.get(day.dateKey) || [];
            const maxVisible = 3;
            const visibleTasks = dayTasks.slice(0, maxVisible);
            const overflowCount = dayTasks.length - maxVisible;

            return (
              <div
                key={day.dateKey}
                className={`group relative flex flex-col min-h-[125px] sm:min-h-[140px] p-2 transition-colors ${
                  day.isCurrentMonth
                    ? "bg-card hover:bg-muted/5"
                    : "bg-muted/15 text-muted/50"
                } ${day.isToday ? "bg-primary/[0.03]" : ""}`}
              >
                {/* Cell Day Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold rounded-full size-6 transition-all ${
                        day.isToday
                          ? "bg-primary text-white shadow-xs"
                          : day.isCurrentMonth
                          ? "text-text group-hover:text-primary"
                          : "text-muted/60"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-muted font-medium">
                        {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                      </span>
                    )}
                  </div>

                  {/* Quick Add Task on this Date button */}
                  <button
                    onClick={() => handleOpenCreateForDate(day.dateKey)}
                    title={`Add task on ${day.dateKey}`}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-primary hover:bg-primary/10 rounded p-1 transition-all"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                {/* Day Tasks List */}
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {visibleTasks.map((task) => {
                    const pStyle = getPriorityBadge(task.priority);
                    const overdue = isOverdue(task.dueDate, task.status);

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedTask(task);
                          }
                        }}
                        className={`group/task border-l-3 bg-background hover:bg-card border-border/80 hover:border-primary/50 text-text relative flex cursor-pointer flex-col rounded-md border p-1.5 text-left text-xs shadow-2xs transition-all hover:shadow-xs hover:-translate-y-0.5 ${pStyle.border} ${
                          task.status === TaskStatus.DONE
                            ? "opacity-70 bg-muted/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {task.status === TaskStatus.DONE ? (
                              <CheckCircle2 className="size-3 text-success shrink-0" />
                            ) : task.status === TaskStatus.IN_PROGRESS ? (
                              <Clock className="size-3 text-secondary shrink-0" />
                            ) : (
                              <div className={`size-1.5 rounded-full shrink-0 ${pStyle.dot}`} />
                            )}
                            <span
                              className={`truncate font-medium text-[11px] leading-tight ${
                                task.status === TaskStatus.DONE
                                  ? "line-through text-muted"
                                  : "text-text"
                              }`}
                            >
                              {task.title}
                            </span>
                          </div>

                          {/* Assignee Avatar */}
                          {task.assignee && (
                            <div
                              title={task.assignee.name || task.assignee.email || "Assignee"}
                              className="bg-primary/10 text-primary flex size-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                            >
                              {task.assignee.name?.charAt(0).toUpperCase() ||
                                task.assignee.email?.charAt(0).toUpperCase() ||
                                "U"}
                            </div>
                          )}
                        </div>

                        {/* Extra indicators */}
                        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted">
                          <span className="truncate max-w-[80px]">{task.team.name}</span>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <CheckSquare className="size-2.5" />
                              {task.subtasks.filter((s) => s.isCompleted).length}/
                              {task.subtasks.length}
                            </span>
                          )}
                          {task.recurrence && task.recurrence !== RecurrenceRule.NONE && (
                            <Repeat className="size-2.5 text-primary" />
                          )}
                          {overdue && (
                            <span className="text-danger font-semibold">Overdue</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Overflow badge "+N more" */}
                  {overflowCount > 0 && (
                    <button
                      onClick={() => setExpandedDayDate(day.dateKey)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/10 w-full rounded py-0.5 text-center text-[10px] font-semibold transition-colors"
                    >
                      +{overflowCount} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Day Tasks Popover / Modal */}
      {expandedDayDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="border-border bg-card w-full max-w-md rounded-xl border p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-text">
                  Tasks for {new Date(expandedDayDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-xs text-muted">
                  {tasksByDate.get(expandedDayDate)?.length || 0} scheduled tasks
                </p>
              </div>
              <button
                onClick={() => setExpandedDayDate(null)}
                className="text-muted hover:text-text rounded-md p-1"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {(tasksByDate.get(expandedDayDate) || []).map((task) => {
                const pStyle = getPriorityBadge(task.priority);
                const sStyle = getStatusBadge(task.status);
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      setExpandedDayDate(null);
                      setSelectedTask(task);
                    }}
                    className={`border-l-3 bg-background hover:bg-muted/10 border-border cursor-pointer rounded-lg border p-3 transition-all ${pStyle.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-text">{task.title}</h4>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sStyle.bg}`}>
                        {sStyle.label}
                      </span>
                    </div>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                      <span>{task.team.name}</span>
                      <span>{task.assignee ? task.assignee.name || task.assignee.email : "Unassigned"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const date = expandedDayDate;
                  setExpandedDayDate(null);
                  handleOpenCreateForDate(date);
                }}
                className="text-xs gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Add Task on this Date</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedDayDate(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
                  These tasks have no due date and are excluded from the calendar grid (visible in List and Board views).
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
                  All current tasks have scheduled due dates!
                </div>
              ) : (
                unscheduledTasks.map((task) => {
                  const pStyle = getPriorityBadge(task.priority);
                  const sStyle = getStatusBadge(task.status);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setShowUnscheduledModal(false);
                        setSelectedTask(task);
                      }}
                      className={`border-l-3 bg-background hover:bg-muted/10 border-border cursor-pointer rounded-lg border p-3 transition-all ${pStyle.border}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-text">{task.title}</h4>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sStyle.bg}`}>
                          {sStyle.label}
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted">
                          {task.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                        <span>{task.team.name}</span>
                        <span>{task.assignee ? task.assignee.name || task.assignee.email : "Unassigned"}</span>
                      </div>
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
                  placeholder="e.g. Design sprint review"
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
                    {createTeamMembers.map((u) => (
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={createDefaultDate}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 mt-1 h-9 w-full rounded-lg border px-3 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text">Estimate (Hours)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="1000"
                    name="estimatedHours"
                    placeholder="e.g. 4.5"
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

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="text-xs font-semibold text-text">Estimate (Hours)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="1000"
                    name="estimatedHours"
                    defaultValue={editingTask.estimatedHours ?? ""}
                    placeholder="e.g. 4.5"
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
