"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import {
  createTeamAction,
  type TeamActionResponse,
} from "./actions";
import { OrgRole, TeamRole, ProjectDomain } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Plus,
  Search,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    domain: ProjectDomain;
    isArchived: boolean;
  };
  creator: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  memberships: {
    role: TeamRole;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      orgRole: OrgRole;
    };
  }[];
  _count: {
    memberships: number;
    tasks: number;
  };
}

interface ProjectSelectOption {
  id: string;
  name: string;
  domain: ProjectDomain;
}

interface TeamsClientProps {
  initialTeams: TeamItem[];
  projects: ProjectSelectOption[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

export function TeamsClient({
  initialTeams,
  projects,
  currentUser,
}: TeamsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [createState, createFormAction, isCreatePending] = useActionState<
    TeamActionResponse,
    FormData
  >(createTeamAction, {});

  const filteredTeams = initialTeams.filter((team) => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description &&
        team.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      team.project.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject =
      selectedProjectId === "ALL" || team.project.id === selectedProjectId;

    return matchesSearch && matchesProject;
  });

  return (
    <div className="space-y-8">
      {/* Header and Action */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted text-xs sm:text-sm">
            Manage functional teams, assign members, and track team-level work.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          disabled={projects.length === 0}
          className="bg-primary hover:bg-primary/90 gap-1.5 self-start text-xs font-semibold text-white shadow-sm sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Create Team</span>
        </Button>
      </div>

      {/* No Projects Notice */}
      {projects.length === 0 && (
        <div className="border-warning/30 bg-warning/10 text-warning flex items-center justify-between rounded-xl border p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <p>
              You need at least one active Project before you can create teams.
            </p>
          </div>
          <Link href="/projects">
            <Button size="sm" variant="outline" className="border-warning/40 text-xs">
              Go to Projects
            </Button>
          </Link>
        </div>
      )}

      {/* Action Alerts */}
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

      {/* Search and Project Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-border bg-card flex w-full max-w-sm items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-xs sm:w-80">
          <Search className="text-muted size-3.5" />
          <input
            type="text"
            placeholder="Search teams or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-text placeholder:text-muted w-full bg-transparent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted hover:text-text text-xs"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Project Selector Filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border-border bg-card text-text rounded-lg border px-3 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.domain})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="border-border bg-card rounded-2xl border p-12 text-center shadow-xs">
          <Users className="text-muted/50 mx-auto size-12" />
          <h3 className="text-text mt-4 text-base font-semibold">
            No teams found
          </h3>
          <p className="text-muted mx-auto mt-1 max-w-sm text-xs">
            {searchQuery || selectedProjectId !== "ALL"
              ? "No teams match your current search or project filter."
              : "Get started by creating your first team under an existing project."}
          </p>
          {projects.length > 0 && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 mt-5 gap-1.5 text-xs font-semibold text-white shadow-xs"
            >
              <Plus className="size-4" />
              <span>Create Team</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => {
            const userMembership = team.memberships.find(
              (m) => m.user.id === currentUser.id
            );
            const isUserOwner = userMembership?.role === TeamRole.OWNER;
            const isUserMember = !!userMembership;

            return (
              <div
                key={team.id}
                className="group border-border bg-card hover:border-primary/50 relative flex flex-col justify-between rounded-xl border p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        team.project.domain === ProjectDomain.DEVELOPMENT
                          ? "bg-primary/10 text-primary"
                          : team.project.domain === ProjectDomain.SALES
                            ? "bg-warning/10 text-warning"
                            : team.project.domain === ProjectDomain.MARKETING
                              ? "bg-secondary/10 text-secondary"
                              : "bg-muted/10 text-muted"
                      }`}
                    >
                      <FolderKanban className="size-3" />
                      <span>{team.project.name}</span>
                    </span>

                    {isUserMember && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          isUserOwner
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/15 text-muted"
                        }`}
                      >
                        <Shield className="size-2.5" />
                        {isUserOwner ? "Team Lead" : "Member"}
                      </span>
                    )}
                  </div>

                  {/* Team Title & Description */}
                  <div>
                    <h3 className="text-text group-hover:text-primary text-base font-bold transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">
                      {team.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics & Link */}
                <div className="border-border/60 mt-5 border-t pt-4">
                  <div className="flex items-center justify-between text-xs">
                    {/* Members stack preview */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {team.memberships.slice(0, 3).map((m) => (
                          <div
                            key={m.user.id}
                            title={`${m.user.name || m.user.email} (${m.role})`}
                            className="border-card bg-primary/10 text-primary flex size-6 items-center justify-center rounded-full border text-[10px] font-bold"
                          >
                            {(m.user.name?.[0] || m.user.email?.[0] || "U").toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span className="text-muted text-[11px]">
                        {team._count.memberships}{" "}
                        {team._count.memberships === 1 ? "member" : "members"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-medium text-muted">
                      <Layers className="size-3" />
                      <span>{team._count.tasks} tasks</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/teams/${team.id}`}
                      className="text-primary hover:text-primary/80 group-hover:translate-x-0.5 inline-flex items-center gap-1 text-xs font-semibold transition-all"
                    >
                      <span>Manage Team</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-primary size-5" />
                <h2 className="text-text text-base font-bold">
                  Create New Team
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
                  htmlFor="team-project"
                  className="text-text block text-xs font-semibold"
                >
                  Parent Project *
                </label>
                <select
                  id="team-project"
                  name="projectId"
                  required
                  defaultValue={
                    selectedProjectId !== "ALL"
                      ? selectedProjectId
                      : projects[0]?.id
                  }
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="team-name"
                  className="text-text block text-xs font-semibold"
                >
                  Team Name *
                </label>
                <input
                  id="team-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineering, Outreach Squad"
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="team-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="team-description"
                  name="description"
                  rows={3}
                  placeholder="What is the mission or focus of this team?"
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <p className="text-muted text-[11px]">
                You will be assigned as the <strong>Team Owner</strong> upon creation.
              </p>

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
                    <span>Create Team</span>
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
