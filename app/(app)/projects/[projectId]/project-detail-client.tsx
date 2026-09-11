"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import {
  updateProjectAction,
  toggleArchiveProjectAction,
  deleteProjectAction,
  type ProjectActionResponse,
} from "../actions";
import { ProjectDomain, OrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
  _count: {
    memberships: number;
    tasks: number;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  isArchived: boolean;
  createdAt: Date;
  teams: Team[];
  _count: {
    teams: number;
  };
}

interface ProjectDetailClientProps {
  project: Project;
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

export function ProjectDetailClient({
  project,
  currentUser,
}: ProjectDetailClientProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [updateState, updateFormAction, isUpdatePending] = useActionState<
    ProjectActionResponse,
    FormData
  >(updateProjectAction, {});

  const [archiveState, archiveFormAction, isArchivePending] = useActionState<
    ProjectActionResponse,
    FormData
  >(toggleArchiveProjectAction, {});

  const [, deleteFormAction] = useActionState<ProjectActionResponse, FormData>(
    deleteProjectAction,
    {}
  );

  const isOwnerOrAdmin =
    currentUser.orgRole === OrgRole.ORG_OWNER ||
    currentUser.orgRole === OrgRole.ORG_ADMIN;

  const totalTasks = project.teams.reduce(
    (acc, t) => acc + (t._count?.tasks || 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="text-muted flex items-center gap-2 text-xs">
        <Link
          href="/projects"
          className="hover:text-text inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="text-text font-medium">{project.name}</span>
      </div>

      {/* Header and Actions */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-text text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${
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
              <span className="bg-muted/20 text-muted rounded px-2 py-0.5 text-xs font-semibold">
                Archived
              </span>
            )}
          </div>
          <p className="text-muted max-w-2xl text-xs leading-relaxed sm:text-sm">
            {project.description || "No description provided for this project."}
          </p>
        </div>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Edit className="size-3.5" />
              <span>Edit</span>
            </Button>

            <form action={archiveFormAction}>
              <input type="hidden" name="projectId" value={project.id} />
              <input
                type="hidden"
                name="isArchived"
                value={project.isArchived ? "false" : "true"}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={isArchivePending}
                className="text-muted hover:text-text gap-1.5 text-xs"
              >
                {project.isArchived ? (
                  <>
                    <ArchiveRestore className="size-3.5" />
                    <span>Unarchive</span>
                  </>
                ) : (
                  <>
                    <Archive className="size-3.5" />
                    <span>Archive</span>
                  </>
                )}
              </Button>
            </form>

            <form
              action={deleteFormAction}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Are you sure you want to delete "${project.name}"? This action is permanent.`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="projectId" value={project.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger hover:bg-danger/10 gap-1.5 text-xs"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Action Alerts */}
      {updateState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{updateState.error}</p>
        </div>
      )}
      {updateState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{updateState.success}</p>
        </div>
      )}
      {archiveState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{archiveState.success}</p>
        </div>
      )}

      {/* Progress Overview Section (PRD.md §6.2.4) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">
              Assigned Teams
            </span>
            <Users className="text-primary size-4" />
          </div>
          <div className="text-text text-2xl font-bold">
            {project.teams.length}
          </div>
          <p className="text-muted text-[11px]">
            Executing teams in this project
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">
              Aggregated Tasks
            </span>
            <CheckCircle2 className="text-success size-4" />
          </div>
          <div className="text-text text-2xl font-bold">{totalTasks}</div>
          <p className="text-muted text-[11px]">Total tasks across all teams</p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">
              Category Domain
            </span>
            <FolderKanban className="text-secondary size-4" />
          </div>
          <div className="text-text text-lg font-bold">{project.domain}</div>
          <p className="text-muted text-[11px]">Functional scope</p>
        </div>
      </div>

      {/* Teams Assigned to this Project */}
      <div className="border-border bg-card space-y-4 overflow-hidden rounded-xl border p-6 shadow-xs">
        <div className="border-border flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-text text-base font-semibold">
              Assigned Teams
            </h2>
            <p className="text-muted text-xs">
              Teams working on tasks under this project
            </p>
          </div>

          <Link href="/teams">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              <span>Create / View Teams</span>
            </Button>
          </Link>
        </div>

        {project.teams.length === 0 ? (
          <div className="text-muted space-y-2 py-8 text-center text-xs">
            <Users className="text-muted/60 mx-auto size-8" />
            <p>No teams assigned to this project yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {project.teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="border-border bg-background hover:border-primary/60 group block space-y-2 rounded-lg border p-4 transition-all hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-text group-hover:text-primary text-sm font-semibold transition-colors">
                    {team.name}
                  </h3>
                  <span className="text-muted text-xs">
                    {team._count.memberships} members
                  </span>
                </div>
                <p className="text-muted line-clamp-2 text-xs">
                  {team.description || "No description provided."}
                </p>
                <div className="text-muted border-border/50 flex items-center justify-between border-t pt-2 text-[11px]">
                  <span>
                    Created by {team.creator.name || team.creator.email}
                  </span>
                  <span className="text-text font-medium">
                    {team._count.tasks} Tasks
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-lg space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <h2 className="text-text text-base font-bold">Edit Project</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateFormAction(formData);
                setIsEditOpen(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="projectId" value={project.id} />

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-name"
                  className="text-text block text-xs font-semibold"
                >
                  Project Name
                </label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={project.name}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-domain"
                  className="text-text block text-xs font-semibold"
                >
                  Domain / Category
                </label>
                <select
                  id="edit-domain"
                  name="domain"
                  defaultValue={project.domain}
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
                  htmlFor="edit-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  defaultValue={project.description || ""}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
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
