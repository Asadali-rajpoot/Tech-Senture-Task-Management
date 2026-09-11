import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/api/proxy";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await requireAuth();

  // Time-of-day greeting (PRD.md §7.1)
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const firstName = session.user?.name
    ? session.user.name.split(" ")[0]
    : "User";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header Greeting */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            All active projects across your workspace and tasks assigned to you.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/tasks/board">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 text-white"
            >
              <Plus className="size-4" />
              <span>New Task</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Dashboard Metrics Widgets (PRD §6.8.1) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">
              Total Tasks
            </span>
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-text text-2xl font-bold">18</div>
            <p className="text-muted mt-0.5 text-xs">Across active projects</p>
          </div>
        </div>

        <div className="border-border bg-card space-y-3 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">
              In Progress
            </span>
            <div className="bg-secondary/10 text-secondary flex size-8 items-center justify-center rounded-lg">
              <Clock className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-text text-2xl font-bold">5</div>
            <p className="text-muted mt-0.5 text-xs">Assigned to team</p>
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
            <div className="text-text text-2xl font-bold">12</div>
            <p className="text-muted mt-0.5 text-xs">85% completion rate</p>
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
            <div className="text-danger text-2xl font-bold">1</div>
            <p className="text-muted mt-0.5 text-xs">
              Requires immediate attention
            </p>
          </div>
        </div>
      </div>

      {/* Active Projects Summary */}
      <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-xs">
        <div className="border-border flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2.5">
            <FolderKanban className="text-primary size-5" />
            <h2 className="text-text text-base font-semibold">
              Active Projects
            </h2>
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
          <div className="flex items-center justify-between py-3.5">
            <div className="space-y-0.5">
              <h3 className="text-text text-sm font-semibold">
                Core Platform Redesign
              </h3>
              <p className="text-muted text-xs">Development • 1 active team</p>
            </div>
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              In Progress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
