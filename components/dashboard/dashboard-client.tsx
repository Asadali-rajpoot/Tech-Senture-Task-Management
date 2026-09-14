"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  ArrowRight,
  Users,
  BarChart3,
  Flame,
  Scale,
  BatteryCharging,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Timer,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type OrgAnalyticsSummary,
  type MemberWorkloadData,
  type TeamWorkloadData,
} from "@/lib/data/analytics";
import { TaskPriority, TaskStatus } from "@prisma/client";

interface DashboardClientProps {
  analytics: OrgAnalyticsSummary;
  greeting: string;
  firstName: string;
  activeProjects: {
    id: string;
    name: string;
    domain: string;
    teams: {
      id: string;
      name: string;
      _count: { tasks: number };
    }[];
  }[];
  userOverdueTasks: {
    id: string;
    title: string;
    dueDate: Date | null;
    team: { name: string };
  }[];
  userUpcomingTasks: {
    id: string;
    title: string;
    dueDate: Date | null;
    team: { name: string };
  }[];
}

type DashboardTab = "overview" | "member-workload" | "team-workload";

export function DashboardClient({
  analytics,
  greeting,
  firstName,
  activeProjects,
  userOverdueTasks,
  userUpcomingTasks,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [workloadFilter, setWorkloadFilter] = useState<string>("ALL");

  const hasReminders =
    userOverdueTasks.length > 0 || userUpcomingTasks.length > 0;

  const { taskStatus, priorityBreakdown, overdue, timeTracking, membersWorkload, teamsWorkload } =
    analytics;

  // Filter members by workload status if selected
  const filteredMembers = membersWorkload.filter((m) => {
    if (workloadFilter === "ALL") return true;
    return m.workloadStatus === workloadFilter;
  });

  const overAllocatedCount = membersWorkload.filter(
    (m) => m.workloadStatus === "OVER_ALLOCATED"
  ).length;
  const balancedCount = membersWorkload.filter(
    (m) => m.workloadStatus === "BALANCED"
  ).length;
  const underAllocatedCount = membersWorkload.filter(
    (m) => m.workloadStatus === "UNDER_ALLOCATED"
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header Greeting & Action Bar */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Workspace overview, team productivity analytics, and capacity workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dashboard Navigation Tabs */}
          <div className="border-border bg-card flex items-center rounded-lg border p-1 shadow-xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <BarChart3 className="size-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("member-workload")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "member-workload"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <Users className="size-3.5" />
              <span>Member Workload</span>
              {overAllocatedCount > 0 && (
                <span className="bg-danger text-white rounded-full px-1.5 py-0.2 text-[9px] font-bold">
                  {overAllocatedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("team-workload")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "team-workload"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <Briefcase className="size-3.5" />
              <span>Team Workload</span>
            </button>
          </div>

          <Link href="/tasks/board">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 text-white shadow-xs"
            >
              <Plus className="size-4" />
              <span>New Task</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Login Reminder Banner for Overdue / Approaching Tasks (PRD §6.5.3 / Module 21) */}
      {hasReminders && activeTab === "overview" && (
        <div className="border-warning/30 bg-warning/[0.08] dark:bg-warning/[0.04] rounded-xl border p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-warning/20 text-warning rounded-lg p-1.5 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">
                  Action Required: Task Reminders
                </h3>
                <p className="text-xs text-muted">
                  You have{" "}
                  {userOverdueTasks.length > 0 && (
                    <span className="text-danger font-bold">
                      {userOverdueTasks.length} overdue task
                      {userOverdueTasks.length > 1 ? "s" : ""}
                    </span>
                  )}
                  {userOverdueTasks.length > 0 && userUpcomingTasks.length > 0 && " and "}
                  {userUpcomingTasks.length > 0 && (
                    <span className="text-warning font-bold">
                      {userUpcomingTasks.length} task
                      {userUpcomingTasks.length > 1 ? "s" : ""} due soon
                    </span>
                  )}{" "}
                  assigned to you.
                </p>
              </div>
            </div>

            <Link href="/tasks/board">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 shrink-0">
                <span>View Tasks</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {userOverdueTasks.map((t) => (
              <Link
                key={t.id}
                href="/tasks/board"
                className="bg-card hover:bg-muted/10 border border-danger/30 rounded-lg p-3 flex items-center justify-between text-xs transition-colors shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-text truncate">{t.title}</p>
                  <p className="text-[11px] text-muted truncate">{t.team.name}</p>
                </div>
                <span className="bg-danger/10 text-danger font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                  Overdue ({new Date(t.dueDate!).toLocaleDateString()})
                </span>
              </Link>
            ))}

            {userUpcomingTasks.map((t) => (
              <Link
                key={t.id}
                href="/tasks/board"
                className="bg-card hover:bg-muted/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between text-xs transition-colors shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-text truncate">{t.title}</p>
                  <p className="text-[11px] text-muted truncate">{t.team.name}</p>
                </div>
                <span className="bg-warning/10 text-warning font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">
                  Due {new Date(t.dueDate!).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: OVERVIEW & ANALYTICS WIDGETS (PRD §6.8.1) */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in">
          {/* Metrics Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-semibold">Total Tasks</span>
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-text text-2xl font-bold">{taskStatus.total}</div>
                <p className="text-muted mt-0.5 text-xs">
                  {taskStatus.todo} to do • {taskStatus.inProgress} active
                </p>
              </div>
            </div>

            <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-semibold">In Progress</span>
                <div className="bg-secondary/10 text-secondary flex size-8 items-center justify-center rounded-lg">
                  <Clock className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-text text-2xl font-bold">{taskStatus.inProgress}</div>
                <p className="text-muted mt-0.5 text-xs">Active workflow tasks</p>
              </div>
            </div>

            <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-semibold">Completed</span>
                <div className="bg-success/10 text-success flex size-8 items-center justify-center rounded-lg">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-text text-2xl font-bold">{taskStatus.done}</div>
                <p className="text-muted mt-0.5 text-xs">
                  {taskStatus.completionRate}% completion rate
                </p>
              </div>
            </div>

            <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-semibold">Overdue</span>
                <div className="bg-danger/10 text-danger flex size-8 items-center justify-center rounded-lg">
                  <Clock className="size-4" />
                </div>
              </div>
              <div>
                <div className="text-danger text-2xl font-bold">{overdue.total}</div>
                <p className="text-muted mt-0.5 text-xs">
                  {overdue.highPriorityOverdue > 0
                    ? `${overdue.highPriorityOverdue} high-priority overdue`
                    : "Requires prompt follow-up"}
                </p>
              </div>
            </div>
          </div>

          {/* Secondary Analytics: Priority & Time Tracking widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority Distribution */}
            <div className="border-border bg-card rounded-xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <span>Priority Breakdown</span>
                </h3>
                <span className="text-xs text-muted">{taskStatus.total} tasks total</span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-danger">High Priority</span>
                    <span className="text-muted">
                      {priorityBreakdown.high} ({taskStatus.total > 0 ? Math.round((priorityBreakdown.high / taskStatus.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-danger h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${taskStatus.total > 0 ? (priorityBreakdown.high / taskStatus.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-warning">Medium Priority</span>
                    <span className="text-muted">
                      {priorityBreakdown.medium} ({taskStatus.total > 0 ? Math.round((priorityBreakdown.medium / taskStatus.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-warning h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${taskStatus.total > 0 ? (priorityBreakdown.medium / taskStatus.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-muted">Low Priority</span>
                    <span className="text-muted">
                      {priorityBreakdown.low} ({taskStatus.total > 0 ? Math.round((priorityBreakdown.low / taskStatus.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-muted h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${taskStatus.total > 0 ? (priorityBreakdown.low / taskStatus.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Tracking & Effort Rollup */}
            <div className="border-border bg-card rounded-xl border p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                  <Timer className="size-4 text-primary" />
                  <span>Time Tracking & Estimates (PRD §6.5.10)</span>
                </h3>
                <span className="text-xs text-muted">Aggregated Effort</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-background border border-border rounded-lg p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Total Estimated
                  </span>
                  <div className="text-xl font-bold text-text">
                    {timeTracking.totalEstimatedHours}h
                  </div>
                  <p className="text-[10px] text-muted">Forecasted effort across tasks</p>
                </div>

                <div className="bg-background border border-border rounded-lg p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Total Logged Time
                  </span>
                  <div className="text-xl font-bold text-primary">
                    {timeTracking.totalLoggedHours}h
                  </div>
                  <p className="text-[10px] text-muted">Actual recorded duration</p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between text-xs">
                <span className="text-muted">Effort Progress Rate:</span>
                <span className="font-bold text-primary">
                  {timeTracking.totalEstimatedHours > 0
                    ? `${Math.round((timeTracking.totalLoggedHours / timeTracking.totalEstimatedHours) * 100)}% of estimate spent`
                    : "No estimates entered"}
                </span>
              </div>
            </div>
          </div>

          {/* Active Projects Summary */}
          <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-xs">
            <div className="border-border flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="text-primary size-5" />
                <h2 className="text-text text-base font-semibold">Active Projects</h2>
              </div>
              <Link
                href="/projects"
                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="divide-border divide-y">
              {activeProjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No active projects found in this workspace.
                </div>
              ) : (
                activeProjects.map((p) => {
                  const totalProjectTasks = p.teams.reduce(
                    (acc: number, t: { _count: { tasks: number } }) => acc + t._count.tasks,
                    0
                  );
                  return (
                    <div key={p.id} className="flex items-center justify-between py-3.5">
                      <div className="space-y-0.5">
                        <Link
                          href={`/projects/${p.id}`}
                          className="text-text hover:text-primary text-sm font-semibold transition-colors"
                        >
                          {p.name}
                        </Link>
                        <p className="text-muted text-xs">
                          {p.domain} • {p.teams.length} active team{p.teams.length === 1 ? "" : "s"} • {totalProjectTasks} task{totalProjectTasks === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Link href={`/projects/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-muted hover:text-text">
                          Details →
                        </Button>
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PER-MEMBER WORKLOAD VIEW (PRD §6.8.2) */}
      {activeTab === "member-workload" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Workload Metric Highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              onClick={() => setWorkloadFilter(workloadFilter === "OVER_ALLOCATED" ? "ALL" : "OVER_ALLOCATED")}
              className={`cursor-pointer border rounded-xl p-5 shadow-xs transition-all ${
                workloadFilter === "OVER_ALLOCATED"
                  ? "border-danger bg-danger/10 ring-2 ring-danger/20"
                  : "border-border bg-card hover:border-danger/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-danger text-xs font-semibold flex items-center gap-1.5">
                  <Flame className="size-4" />
                  <span>Over-Allocated</span>
                </span>
                <span className="bg-danger/15 text-danger font-bold text-xs px-2 py-0.5 rounded-full">
                  {overAllocatedCount}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-danger">{overAllocatedCount}</div>
                <p className="text-muted text-xs mt-0.5">Heavy task load or high-priority burden</p>
              </div>
            </div>

            <div
              onClick={() => setWorkloadFilter(workloadFilter === "BALANCED" ? "ALL" : "BALANCED")}
              className={`cursor-pointer border rounded-xl p-5 shadow-xs transition-all ${
                workloadFilter === "BALANCED"
                  ? "border-success bg-success/10 ring-2 ring-success/20"
                  : "border-border bg-card hover:border-success/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-success text-xs font-semibold flex items-center gap-1.5">
                  <Scale className="size-4" />
                  <span>Balanced Load</span>
                </span>
                <span className="bg-success/15 text-success font-bold text-xs px-2 py-0.5 rounded-full">
                  {balancedCount}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-success">{balancedCount}</div>
                <p className="text-muted text-xs mt-0.5">Optimal allocation capacity</p>
              </div>
            </div>

            <div
              onClick={() => setWorkloadFilter(workloadFilter === "UNDER_ALLOCATED" ? "ALL" : "UNDER_ALLOCATED")}
              className={`cursor-pointer border rounded-xl p-5 shadow-xs transition-all ${
                workloadFilter === "UNDER_ALLOCATED"
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs font-semibold flex items-center gap-1.5">
                  <BatteryCharging className="size-4" />
                  <span>Under-Allocated</span>
                </span>
                <span className="bg-muted/15 text-muted font-bold text-xs px-2 py-0.5 rounded-full">
                  {underAllocatedCount}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-text">{underAllocatedCount}</div>
                <p className="text-muted text-xs mt-0.5">Available capacity for new tasks</p>
              </div>
            </div>
          </div>

          {/* Members Workload List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-text">Team Member Allocations</h3>
                <p className="text-xs text-muted">
                  Accounts for time estimates (Module 17) where available, and active task counts otherwise.
                </p>
              </div>
              {workloadFilter !== "ALL" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWorkloadFilter("ALL")}
                  className="text-xs text-muted hover:text-text"
                >
                  Clear Filter (Showing {workloadFilter.replace("_", " ")})
                </Button>
              )}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="border-border bg-card rounded-xl border p-12 text-center shadow-xs">
                <Users className="text-muted/40 mx-auto size-10" />
                <h4 className="text-sm font-semibold text-text mt-3">No members found</h4>
                <p className="text-xs text-muted mt-1">No members match the selected workload filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map((member) => {
                  const isOverAllocated = member.workloadStatus === "OVER_ALLOCATED";
                  const isUnderAllocated = member.workloadStatus === "UNDER_ALLOCATED";

                  return (
                    <div
                      key={member.userId}
                      className={`rounded-xl border p-5 shadow-xs space-y-4 transition-all ${
                        isOverAllocated
                          ? "border-danger/50 bg-danger/[0.03] shadow-danger/5"
                          : isUnderAllocated
                            ? "border-border/70 bg-card/60"
                            : "border-border bg-card"
                      }`}
                    >
                      {/* Member Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isOverAllocated
                                ? "bg-danger/20 text-danger"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-text truncate">{member.name}</h4>
                            <p className="text-[11px] text-muted truncate">{member.email}</p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase shrink-0 ${member.statusBadge.bg} ${member.statusBadge.color} ${member.statusBadge.border}`}
                        >
                          {member.statusBadge.label}
                        </span>
                      </div>

                      {/* Workload Capacity Bar */}
                      <div className="space-y-1.5 bg-background border border-border/60 rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-muted">Effort & Task Burden:</span>
                          <span className="font-bold text-text">
                            {member.totalEstimatedHours > 0
                              ? `${member.totalEstimatedHours}h estimated`
                              : `${member.activeTasksCount} active tasks`}
                          </span>
                        </div>
                        <div className="w-full bg-muted/20 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverAllocated
                                ? "bg-danger"
                                : isUnderAllocated
                                  ? "bg-muted"
                                  : "bg-success"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  10,
                                  member.totalEstimatedHours > 0
                                    ? (member.totalEstimatedHours / 40) * 100
                                    : (member.activeTasksCount / 8) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Metric Grid */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-background border border-border/50 rounded-lg p-2">
                          <span className="text-[10px] text-muted block">Active</span>
                          <span className="font-bold text-text text-sm">{member.activeTasksCount}</span>
                        </div>
                        <div className="bg-background border border-border/50 rounded-lg p-2">
                          <span className="text-[10px] text-danger block">High Pri</span>
                          <span className="font-bold text-danger text-sm">{member.highPriorityCount}</span>
                        </div>
                        <div className="bg-background border border-border/50 rounded-lg p-2">
                          <span className="text-[10px] text-muted block">Overdue</span>
                          <span className={`font-bold text-sm ${member.overdueCount > 0 ? "text-danger" : "text-text"}`}>
                            {member.overdueCount}
                          </span>
                        </div>
                        <div className="bg-background border border-border/50 rounded-lg p-2">
                          <span className="text-[10px] text-muted block">Done</span>
                          <span className="font-bold text-success text-sm">{member.doneCount}</span>
                        </div>
                      </div>

                      {/* Active Tasks Snippet */}
                      {member.assignedActiveTasks.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
                            Assigned Active Tasks
                          </span>
                          <div className="space-y-1">
                            {member.assignedActiveTasks.map((task) => (
                              <Link
                                key={task.id}
                                href="/tasks/list"
                                className="flex items-center justify-between p-1.5 rounded hover:bg-background/80 text-[11px] transition-colors border border-transparent hover:border-border/60"
                              >
                                <span className="truncate text-text font-medium pr-2">
                                  {task.title}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {task.priority === TaskPriority.HIGH && (
                                    <span className="bg-danger/10 text-danger text-[9px] font-bold px-1 rounded">
                                      HIGH
                                    </span>
                                  )}
                                  {task.estimatedHours && (
                                    <span className="text-muted text-[10px]">
                                      {task.estimatedHours}h
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PER-TEAM WORKLOAD VIEW (PRD §6.8.2) */}
      {activeTab === "team-workload" && (
        <div className="space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-base font-semibold text-text">Team Workload Distribution</h3>
            <p className="text-xs text-muted">
              Capacity distribution, active task volume, and tasks-per-member ratios across all teams.
            </p>
          </div>

          {teamsWorkload.length === 0 ? (
            <div className="border-border bg-card rounded-xl border p-12 text-center shadow-xs">
              <Briefcase className="text-muted/40 mx-auto size-10" />
              <h4 className="text-sm font-semibold text-text mt-3">No teams found</h4>
              <p className="text-xs text-muted mt-1">Create teams in your workspace to view team workload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teamsWorkload.map((team) => (
                <div
                  key={team.teamId}
                  className="border-border bg-card rounded-xl border p-5 shadow-xs space-y-4 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/teams/${team.teamId}`}
                        className="font-bold text-sm text-text hover:text-primary transition-colors line-clamp-1"
                      >
                        {team.name}
                      </Link>
                      <span className="text-[11px] text-muted">Project: {team.projectName}</span>
                    </div>
                    <span className="bg-primary/10 text-primary font-semibold text-[10px] px-2 py-0.5 rounded">
                      {team.membersCount} {team.membersCount === 1 ? "member" : "members"}
                    </span>
                  </div>

                  {/* Team Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-background border border-border/50 rounded-lg p-2">
                      <span className="text-[10px] text-muted block">Active Tasks</span>
                      <span className="font-bold text-text text-sm">{team.activeTasks}</span>
                    </div>
                    <div className="bg-background border border-border/50 rounded-lg p-2">
                      <span className="text-[10px] text-muted block">Task / Member</span>
                      <span className="font-bold text-primary text-sm">{team.tasksPerMember}</span>
                    </div>
                    <div className="bg-background border border-border/50 rounded-lg p-2">
                      <span className="text-[10px] text-muted block">Estimated</span>
                      <span className="font-bold text-text text-sm">{team.totalEstimatedHours}h</span>
                    </div>
                  </div>

                  {/* Progress & Overdue */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Completed Tasks</span>
                      <span className="font-semibold text-text">
                        {team.doneTasks} of {team.totalTasks} ({team.totalTasks > 0 ? Math.round((team.doneTasks / team.totalTasks) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-success h-full rounded-full"
                        style={{
                          width: `${team.totalTasks > 0 ? (team.doneTasks / team.totalTasks) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {team.overdueTasks > 0 && (
                    <div className="bg-danger/10 text-danger border border-danger/20 rounded-lg p-2 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="size-3.5" />
                        <span>Overdue Tasks:</span>
                      </span>
                      <span className="font-bold">{team.overdueTasks}</span>
                    </div>
                  )}

                  <Link href={`/teams/${team.teamId}`} className="block pt-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      View Team Workspace →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
