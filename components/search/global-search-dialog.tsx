"use client";

import React, { useState, useEffect, useRef, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckSquare,
  FolderKanban,
  Users,
  X,
  Loader2,
  ArrowRight,
  Command,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  globalSearchAction,
  type SearchActionResponse,
} from "@/app/(app)/search/actions";
import {
  type SearchTaskResult,
  type SearchProjectResult,
  type SearchTeamResult,
} from "@/lib/data/search";
import { TaskStatus, TaskPriority, ProjectDomain } from "@prisma/client";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "all" | "tasks" | "projects" | "teams";

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [tasks, setTasks] = useState<SearchTaskResult[]>([]);
  const [projects, setProjects] = useState<SearchProjectResult[]>([]);
  const [teams, setTeams] = useState<SearchTeamResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setTasks([]);
      setProjects([]);
      setTeams([]);
      setTotalMatches(0);
      setHasSearched(false);
      setActiveTab("all");
    }
  }, [isOpen]);

  // Debounced live search
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setTasks([]);
      setProjects([]);
      setTeams([]);
      setTotalMatches(0);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const res: SearchActionResponse = await globalSearchAction(trimmed);
        if (res.results) {
          setTasks(res.results.tasks);
          setProjects(res.results.projects);
          setTeams(res.results.teams);
          setTotalMatches(res.results.totalMatches);
        }
        setHasSearched(true);
        setIsSearching(false);
      });
    }, 200);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

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

  const getDomainBadge = (domain: ProjectDomain) => {
    switch (domain) {
      case ProjectDomain.SALES:
        return "bg-blue-500/15 text-blue-500 border-blue-500/30";
      case ProjectDomain.DEVELOPMENT:
        return "bg-indigo-500/15 text-indigo-500 border-indigo-500/30";
      case ProjectDomain.MARKETING:
        return "bg-purple-500/15 text-purple-500 border-purple-500/30";
      case ProjectDomain.OPERATIONS:
        return "bg-amber-500/15 text-amber-500 border-amber-500/30";
      default:
        return "bg-muted/15 text-muted border-border";
    }
  };

  const showTasks = (activeTab === "all" || activeTab === "tasks") && tasks.length > 0;
  const showProjects =
    (activeTab === "all" || activeTab === "projects") && projects.length > 0;
  const showTeams = (activeTab === "all" || activeTab === "teams") && teams.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="border-border bg-card relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* Search Header */}
        <div className="border-border flex items-center gap-3 border-b px-4 py-3.5 sm:px-6">
          <Search className="text-muted size-5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, teams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-text placeholder:text-muted flex-1 bg-transparent text-sm focus:outline-none sm:text-base"
          />
          {isSearching && (
            <Loader2 className="text-primary size-4 animate-spin shrink-0" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => setQuery("")}
              className="text-muted hover:text-text rounded p-1"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="border-border bg-background text-muted hover:text-text hidden rounded border px-1.5 py-0.5 text-[11px] font-medium sm:block"
          >
            ESC
          </button>
        </div>

        {/* Category Tabs */}
        {hasSearched && totalMatches > 0 && (
          <div className="border-border bg-background/50 flex items-center gap-1.5 border-b px-4 py-2 sm:px-6">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted hover:text-text"
              }`}
            >
              All ({totalMatches})
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === "tasks"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <CheckSquare className="size-3" />
              <span>Tasks ({tasks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("projects")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === "projects"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <FolderKanban className="size-3" />
              <span>Projects ({projects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("teams")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                activeTab === "teams"
                  ? "bg-primary text-white shadow-2xs"
                  : "text-muted hover:text-text"
              }`}
            >
              <Users className="size-3" />
              <span>Teams ({teams.length})</span>
            </button>
          </div>
        )}

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!query.trim() ? (
            <div className="space-y-4 py-6 text-center">
              <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
                <Sparkles className="size-6" />
              </div>
              <div>
                <h4 className="text-text text-sm font-semibold">
                  Global Workspace Search
                </h4>
                <p className="text-muted mx-auto mt-1 max-w-sm text-xs">
                  Type any keyword to search across all your organization&apos;s tasks, projects, and teams simultaneously.
                </p>
              </div>

              <div className="border-border/50 mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 pt-2 text-[11px]">
                <span className="text-muted">Quick shortcuts:</span>
                <button
                  onClick={() => setQuery("marketing")}
                  className="border-border bg-background text-muted hover:text-primary rounded border px-2 py-0.5"
                >
                  marketing
                </button>
                <button
                  onClick={() => setQuery("bug")}
                  className="border-border bg-background text-muted hover:text-primary rounded border px-2 py-0.5"
                >
                  bug
                </button>
                <button
                  onClick={() => setQuery("feature")}
                  className="border-border bg-background text-muted hover:text-primary rounded border px-2 py-0.5"
                >
                  feature
                </button>
              </div>
            </div>
          ) : hasSearched && totalMatches === 0 ? (
            <div className="py-12 text-center">
              <Search className="text-muted/40 mx-auto size-10" />
              <h4 className="text-text mt-3 text-sm font-semibold">
                No matching results found
              </h4>
              <p className="text-muted mx-auto mt-1 max-w-sm text-xs">
                We couldn&apos;t find any tasks, projects, or teams matching &ldquo;{query}&rdquo; in your workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tasks Section */}
              {showTasks && (
                <div className="space-y-2">
                  <div className="text-muted flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                    <CheckSquare className="size-3.5" />
                    <span>Tasks ({tasks.length})</span>
                  </div>
                  <div className="divide-border/60 border-border bg-background overflow-hidden rounded-xl border divide-y">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => navigateTo(`/tasks/board?search=${encodeURIComponent(task.title)}`)}
                        className="hover:bg-card/80 group flex w-full items-center justify-between p-3 text-left transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1 pr-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-text group-hover:text-primary truncate text-xs font-semibold transition-colors">
                              {task.title}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${getStatusBadge(
                                task.status
                              )}`}
                            >
                              {task.status}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${getPriorityBadge(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          <div className="text-muted flex items-center gap-2 text-[11px]">
                            <span className="truncate">
                              {task.team.project.name} &bull; {task.team.name}
                            </span>
                            {task.assignee && (
                              <span>
                                &bull; Assigned to {task.assignee.name || task.assignee.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="text-muted group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Section */}
              {showProjects && (
                <div className="space-y-2">
                  <div className="text-muted flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                    <FolderKanban className="size-3.5" />
                    <span>Projects ({projects.length})</span>
                  </div>
                  <div className="divide-border/60 border-border bg-background overflow-hidden rounded-xl border divide-y">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => navigateTo(`/projects/${project.id}`)}
                        className="hover:bg-card/80 group flex w-full items-center justify-between p-3 text-left transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-text group-hover:text-primary truncate text-xs font-semibold transition-colors">
                              {project.name}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase ${getDomainBadge(
                                project.domain
                              )}`}
                            >
                              {project.domain}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-muted line-clamp-1 text-[11px]">
                              {project.description}
                            </p>
                          )}
                          <div className="text-muted text-[10px]">
                            {project.teamsCount} {project.teamsCount === 1 ? "team" : "teams"}
                          </div>
                        </div>
                        <ArrowRight className="text-muted group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams Section */}
              {showTeams && (
                <div className="space-y-2">
                  <div className="text-muted flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
                    <Users className="size-3.5" />
                    <span>Teams ({teams.length})</span>
                  </div>
                  <div className="divide-border/60 border-border bg-background overflow-hidden rounded-xl border divide-y">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => navigateTo(`/teams/${team.id}`)}
                        className="hover:bg-card/80 group flex w-full items-center justify-between p-3 text-left transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-text group-hover:text-primary truncate text-xs font-semibold transition-colors">
                              {team.name}
                            </span>
                            <span className="border-border bg-background text-muted rounded border px-1.5 py-0.2 text-[9px] font-medium">
                              Project: {team.project.name}
                            </span>
                          </div>
                          {team.description && (
                            <p className="text-muted line-clamp-1 text-[11px]">
                              {team.description}
                            </p>
                          )}
                          <div className="text-muted flex items-center gap-2 text-[10px]">
                            <span>{team.membersCount} members</span>
                            <span>&bull;</span>
                            <span>{team.tasksCount} tasks</span>
                          </div>
                        </div>
                        <ArrowRight className="text-muted group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border bg-background/50 flex items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="border-border bg-card rounded border px-1 py-0.5 font-mono text-[10px]">
                Cmd+K
              </kbd>{" "}
              or{" "}
              <kbd className="border-border bg-card rounded border px-1 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>{" "}
              anywhere
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-text transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
