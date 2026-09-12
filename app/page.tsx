import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/shared/app-shell";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Welcome Banner */}
        <div className="border-border bg-card relative overflow-hidden rounded-2xl border p-6 shadow-xs md:p-8">
          <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 size-64 translate-x-8 -translate-y-8 rounded-full blur-2xl" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>Phase 0 — Design System & Shell Ready</span>
            </div>
            <h1 className="text-text text-2xl font-bold tracking-tight sm:text-3xl">
              Multi-Organization Task & Project Platform
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              Structured workspace for planning, assigning, and tracking work
              across teams. Built on a strict 4-level hierarchy:{" "}
              <strong>Organization → Project → Team → Task</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 gap-2 text-white"
                >
                  <span>Sign in</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="outline" className="gap-2">
                  <span>Create Account</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Placeholder Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border bg-card space-y-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-medium">
                Active Projects
              </span>
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <FolderKanban className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-text text-2xl font-bold">4</div>
              <p className="text-muted mt-0.5 text-xs">Across 3 domains</p>
            </div>
          </div>

          <div className="border-border bg-card space-y-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-medium">Teams</span>
              <div className="bg-secondary/10 text-secondary flex size-8 items-center justify-center rounded-lg">
                <Users className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-text text-2xl font-bold">8</div>
              <p className="text-muted mt-0.5 text-xs">24 total members</p>
            </div>
          </div>

          <div className="border-border bg-card space-y-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-medium">
                Completed Tasks
              </span>
              <div className="bg-success/10 text-success flex size-8 items-center justify-center rounded-lg">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-text text-2xl font-bold">64</div>
              <p className="text-muted mt-0.5 text-xs">+12 this week</p>
            </div>
          </div>

          <div className="border-border bg-card space-y-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-medium">
                Due Soon / Overdue
              </span>
              <div className="bg-danger/10 text-danger flex size-8 items-center justify-center rounded-lg">
                <Clock className="size-4" />
              </div>
            </div>
            <div>
              <div className="text-danger text-2xl font-bold">3</div>
              <p className="text-muted mt-0.5 text-xs">Needs attention</p>
            </div>
          </div>
        </div>

        {/* Hierarchy Overview Section */}
        <div className="border-border bg-card space-y-4 rounded-xl border p-6">
          <h2 className="text-text text-base font-semibold">
            Platform Hierarchy Structure
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="bg-background border-border/80 space-y-1.5 rounded-lg border p-4">
              <span className="text-primary text-[10px] font-bold tracking-wider uppercase">
                Level 1
              </span>
              <h3 className="text-text text-sm font-semibold">Organization</h3>
              <p className="text-muted text-xs">
                Multi-tenant boundary, ORG_OWNER / ORG_ADMIN / ORG_MEMBER roles.
              </p>
            </div>
            <div className="bg-background border-border/80 space-y-1.5 rounded-lg border p-4">
              <span className="text-secondary text-[10px] font-bold tracking-wider uppercase">
                Level 2
              </span>
              <h3 className="text-text text-sm font-semibold">Project</h3>
              <p className="text-muted text-xs">
                Categorized by domain (Sales, Dev, Other), contains multiple
                teams.
              </p>
            </div>
            <div className="bg-background border-border/80 space-y-1.5 rounded-lg border p-4">
              <span className="text-warning text-[10px] font-bold tracking-wider uppercase">
                Level 3
              </span>
              <h3 className="text-text text-sm font-semibold">Team</h3>
              <p className="text-muted text-xs">
                Team-level roles (OWNER, MEMBER), manages own tasks and labels.
              </p>
            </div>
            <div className="bg-background border-border/80 space-y-1.5 rounded-lg border p-4">
              <span className="text-success text-[10px] font-bold tracking-wider uppercase">
                Level 4
              </span>
              <h3 className="text-text text-sm font-semibold">Task</h3>
              <p className="text-muted text-xs">
                Single assignee, priority, due date, subtasks, and position
                float.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
