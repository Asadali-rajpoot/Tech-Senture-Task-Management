"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import {
  createProjectAction,
  toggleArchiveProjectAction,
  deleteProjectAction,
  type ProjectActionResponse,
} from "./actions";
import { ProjectDomain, OrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpRight,
  X,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  isArchived: boolean;
  createdAt: Date;
  teams: {
    id: string;
    name: string;
    _count: {
      memberships: number;
      tasks: number;
    };
  }[];
  _count: {
    teams: number;
  };
}

interface ProjectsClientProps {
  projects: Project[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

const domains: { value: ProjectDomain | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Domains" },
  { value: ProjectDomain.DEVELOPMENT, label: "Development" },
  { value: ProjectDomain.SALES, label: "Sales" },
  { value: ProjectDomain.MARKETING, label: "Marketing" },
  { value: ProjectDomain.OPERATIONS, label: "Operations" },
  { value: ProjectDomain.OTHER, label: "Other" },
];

export function ProjectsClient({ projects, currentUser }: ProjectsClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [selectedDomain, setSelectedDomain] = useState<ProjectDomain | "ALL">(
    "ALL"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [createState, createFormAction, isCreatePending] = useActionState<
    ProjectActionResponse,
    FormData
  >(createProjectAction, {});

  const [archiveState, archiveFormAction] = useActionState<
    ProjectActionResponse,
    FormData
  >(toggleArchiveProjectAction, {});

  const [deleteState, deleteFormAction] = useActionState<
    ProjectActionResponse,
    FormData
  >(deleteProjectAction, {});

  const isOwnerOrAdmin =
    currentUser.orgRole === OrgRole.ORG_OWNER ||
    currentUser.orgRole === OrgRole.ORG_ADMIN;

  // Filter projects based on active/archived status, domain, and search query
  const filteredProjects = projects.filter((project) => {
    const matchesTab =
      activeTab === "active" ? !project.isArchived : project.isArchived;
    const matchesDomain =
      selectedDomain === "ALL" || project.domain === selectedDomain;
    const matchesSearch =
      searchQuery.trim() === "" ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description &&
        project.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and New Project CTA */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            Projects
          </h1>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Organize work across departments and assign dedicated teams.
          </p>
        </div>

        {isOwnerOrAdmin && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-2 self-start text-xs text-white shadow-xs sm:self-auto"
          >
            <Plus className="size-4" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* Global Alerts */}
      {createState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{createState.error}</p>
        </div>
      )}
      {createState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{createState.success}</p>
        </div>
      )}
      {archiveState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{archiveState.error}</p>
        </div>
      )}
      {archiveState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{archiveState.success}</p>
        </div>
      )}
      {deleteState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{deleteState.error}</p>
        </div>
      )}
      {deleteState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{deleteState.success}</p>
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* Active vs. Archived Tabs */}
        <div className="bg-card border-border flex items-center gap-2 self-start rounded-lg border p-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "active"
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-muted hover:text-text"
            }`}
          >
            Active Projects ({projects.filter((p) => !p.isArchived).length})
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "archived"
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-muted hover:text-text"
            }`}
          >
            Archived ({projects.filter((p) => p.isArchived).length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-card text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-1.5 pr-3 pl-9 text-xs transition-all focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Domain Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {domains.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDomain(d.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-all ${
              selectedDomain === d.value
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-muted hover:text-text hover:border-border/80"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        /* Empty State (PRD.md §7.1) */
        <div className="border-border bg-card space-y-4 rounded-xl border border-dashed p-12 text-center">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
            <FolderKanban className="size-6" />
          </div>
          <div className="mx-auto max-w-sm space-y-1">
            <h3 className="text-text text-sm font-semibold">
              {searchQuery || selectedDomain !== "ALL"
                ? "No matching projects found"
                : activeTab === "archived"
                  ? "No archived projects"
                  : "No active projects yet"}
            </h3>
            <p className="text-muted text-xs">
              {searchQuery || selectedDomain !== "ALL"
                ? "Try adjusting your search query or domain category filter."
                : activeTab === "archived"
                  ? "Projects you archive will appear here for historical reference."
                  : "Create your first project to start organizing teams and assigning tasks."}
            </p>
          </div>
          {isOwnerOrAdmin &&
            activeTab === "active" &&
            !searchQuery &&
            selectedDomain === "ALL" && (
              <Button
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 gap-2 text-xs text-white"
              >
                <Plus className="size-4" />
                <span>Create Project</span>
              </Button>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const totalTasks = project.teams.reduce(
              (acc, t) => acc + (t._count?.tasks || 0),
              0
            );

            return (
              <div
                key={project.id}
                className="border-border bg-card flex flex-col justify-between space-y-4 rounded-xl border p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
                        project.domain === ProjectDomain.DEVELOPMENT
                          ? "bg-primary/10 text-primary"
                          : project.domain === ProjectDomain.SALES
                            ? "bg-warning/10 text-warning"
                            : project.domain === ProjectDomain.MARKETING
                              ? "bg-secondary/10 text-secondary"
                              : "bg-muted/10 text-muted"
                      }`}
                    >
                      {project.domain}
                    </span>

                    {project.isArchived && (
                      <span className="bg-muted/20 text-muted rounded px-2 py-0.5 text-[10px] font-semibold">
                        Archived
                      </span>
                    )}
                  </div>

                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="group inline-flex items-center gap-1.5"
                    >
                      <h3 className="text-text group-hover:text-primary text-base font-semibold transition-colors">
                        {project.name}
                      </h3>
                      <ArrowUpRight className="text-muted size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                    <p className="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">
                      {project.description || "No description provided."}
                    </p>
                  </div>
                </div>

                <div className="border-border text-muted flex items-center justify-between border-t pt-3.5 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="text-muted size-3.5" />
                      {project._count.teams}{" "}
                      {project._count.teams === 1 ? "Team" : "Teams"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="text-muted size-3.5" />
                      {totalTasks} Tasks
                    </span>
                  </div>

                  {isOwnerOrAdmin && (
                    <div className="flex items-center gap-1">
                      <form action={archiveFormAction}>
                        <input
                          type="hidden"
                          name="projectId"
                          value={project.id}
                        />
                        <input
                          type="hidden"
                          name="isArchived"
                          value={project.isArchived ? "false" : "true"}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-muted hover:text-text size-7"
                          title={
                            project.isArchived
                              ? "Unarchive Project"
                              : "Archive Project"
                          }
                        >
                          {project.isArchived ? (
                            <ArchiveRestore className="size-3.5" />
                          ) : (
                            <Archive className="size-3.5" />
                          )}
                        </Button>
                      </form>

                      <form
                        action={deleteFormAction}
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              `Are you sure you want to delete project "${project.name}"? This action cannot be undone.`
                            )
                          ) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input
                          type="hidden"
                          name="projectId"
                          value={project.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-muted hover:text-danger hover:bg-danger/10 size-7"
                          title="Delete Project"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-lg space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg font-bold">
                  <FolderKanban className="size-4" />
                </div>
                <h2 className="text-text text-base font-bold">
                  Create New Project
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createFormAction(formData);
                setIsCreateOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-text block text-xs font-semibold"
                >
                  Project Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Core Platform Redesign"
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="domain"
                  className="text-text block text-xs font-semibold"
                >
                  Domain / Category
                </label>
                <select
                  id="domain"
                  name="domain"
                  defaultValue={ProjectDomain.DEVELOPMENT}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                >
                  <option value={ProjectDomain.DEVELOPMENT}>Development</option>
                  <option value={ProjectDomain.SALES}>Sales</option>
                  <option value={ProjectDomain.MARKETING}>Marketing</option>
                  <option value={ProjectDomain.OPERATIONS}>Operations</option>
                  <option value={ProjectDomain.OTHER}>Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="description"
                  className="text-text block text-xs font-semibold"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Briefly describe the goals and scope of this project..."
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
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
                  className="bg-primary hover:bg-primary/90 gap-2 text-xs text-white"
                >
                  {isCreatePending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  <span>Create Project</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
