"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateTeamAction,
  deleteTeamAction,
  addTeamMemberAction,
  updateTeamMemberRoleAction,
  removeTeamMemberAction,
  type TeamActionResponse,
} from "../actions";
import { OrgRole, TeamRole, ProjectDomain, TaskStatus, TaskPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  Edit,
  ArrowLeft,
  Plus,
  Shield,
  ShieldAlert,
  UserPlus,
  UserMinus,
  CheckSquare,
} from "lucide-react";

interface TeamMember {
  role: TeamRole;
  joinedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    orgRole: OrgRole;
  };
}

interface OrgMemberOption {
  id: string;
  name: string | null;
  email: string | null;
  orgRole: OrgRole;
}

interface ProjectOption {
  id: string;
  name: string;
  domain: ProjectDomain;
}

interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

interface TeamDetail {
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
  memberships: TeamMember[];
  tasks: TaskSummary[];
  _count: {
    memberships: number;
    tasks: number;
  };
}

interface TeamDetailClientProps {
  team: TeamDetail;
  orgProjects: ProjectOption[];
  availableOrgMembers: OrgMemberOption[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

export function TeamDetailClient({
  team,
  orgProjects,
  availableOrgMembers,
  currentUser,
}: TeamDetailClientProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Form action states
  const [updateState, updateFormAction, isUpdatePending] = useActionState<
    TeamActionResponse,
    FormData
  >(updateTeamAction, {});

  const [deleteState, deleteFormAction, isDeletePending] = useActionState<
    TeamActionResponse,
    FormData
  >(deleteTeamAction, {});

  const [addMemberState, addMemberFormAction, isAddMemberPending] =
    useActionState<TeamActionResponse, FormData>(addTeamMemberAction, {});

  const [roleState, roleFormAction] = useActionState<
    TeamActionResponse,
    FormData
  >(updateTeamMemberRoleAction, {});

  const [removeState, removeFormAction] = useActionState<
    TeamActionResponse,
    FormData
  >(removeTeamMemberAction, {});

  React.useEffect(() => {
    if (deleteState?.success) {
      router.push("/teams");
    }
  }, [deleteState?.success, router]);

  // Current user permissions in this team
  const userMembership = team.memberships.find(
    (m) => m.user.id === currentUser.id
  );
  const isTeamOwner = userMembership?.role === TeamRole.OWNER;
  const isOrgOwner = currentUser.orgRole === OrgRole.ORG_OWNER;
  const isOrgAdmin = currentUser.orgRole === OrgRole.ORG_ADMIN;

  // Edit / Add Member permissions
  const canManageMembers = isTeamOwner || isOrgOwner || isOrgAdmin;
  const canEditTeam = isTeamOwner || isOrgOwner || isOrgAdmin;
  const canDeleteTeam = isTeamOwner || isOrgOwner; // Strictly OWNER or ORG_OWNER

  // Filter out members already in the team
  const nonTeamOrgMembers = availableOrgMembers.filter(
    (orgM) => !team.memberships.some((tm) => tm.user.id === orgM.id)
  );

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="text-muted flex items-center gap-2 text-xs">
        <Link
          href="/teams"
          className="hover:text-text inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Teams</span>
        </Link>
        <span>/</span>
        <span className="text-text font-medium">{team.name}</span>
      </div>

      {/* Header and Actions */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-text text-2xl font-bold tracking-tight">
              {team.name}
            </h1>
            <Link
              href={`/projects/${team.project.id}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-opacity hover:opacity-80 ${
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
            </Link>
            {isTeamOwner && (
              <span className="bg-primary/15 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold">
                <Shield className="size-3" />
                Team Owner
              </span>
            )}
          </div>
          <p className="text-muted max-w-2xl text-xs leading-relaxed sm:text-sm">
            {team.description || "No description provided for this team."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canEditTeam && (
            <Button
              onClick={() => setIsEditOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Edit className="size-3.5" />
              <span>Edit Team</span>
            </Button>
          )}

          {canDeleteTeam && (
            <form
              action={deleteFormAction}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `Are you sure you want to delete "${team.name}"? All memberships and associated tasks will be removed.`
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="teamId" value={team.id} />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                disabled={isDeletePending}
                className="text-danger hover:text-danger hover:bg-danger/10 gap-1.5 text-xs"
              >
                {isDeletePending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="size-3.5" />
                    <span>Delete Team</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
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
      {deleteState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{deleteState.error}</p>
        </div>
      )}
      {addMemberState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{addMemberState.error}</p>
        </div>
      )}
      {addMemberState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{addMemberState.success}</p>
        </div>
      )}
      {roleState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{roleState.error}</p>
        </div>
      )}
      {roleState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{roleState.success}</p>
        </div>
      )}
      {removeState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{removeState.error}</p>
        </div>
      )}
      {removeState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{removeState.success}</p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">Team Members</span>
            <Users className="text-primary size-4" />
          </div>
          <div className="text-text text-2xl font-bold">
            {team.memberships.length}
          </div>
          <p className="text-muted text-[11px]">Assigned active members</p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">Total Tasks</span>
            <CheckSquare className="text-success size-4" />
          </div>
          <div className="text-text text-2xl font-bold">
            {team._count.tasks}
          </div>
          <p className="text-muted text-[11px]">Tasks managed by this team</p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold">Parent Project</span>
            <FolderKanban className="text-secondary size-4" />
          </div>
          <div className="text-text truncate text-lg font-bold">
            {team.project.name}
          </div>
          <p className="text-muted text-[11px]">Domain: {team.project.domain}</p>
        </div>
      </div>

      {/* Team Members Management Section */}
      <div className="border-border bg-card space-y-5 rounded-xl border p-6 shadow-xs">
        <div className="border-border flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-text text-base font-bold">Team Members</h2>
            <p className="text-muted text-xs">
              Staff members collaborating within this team
            </p>
          </div>

          {canManageMembers && (
            <Button
              onClick={() => setIsAddMemberOpen(true)}
              size="sm"
              disabled={nonTeamOrgMembers.length === 0}
              className="bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold text-white shadow-xs"
            >
              <UserPlus className="size-3.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>

        {/* Member Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-border text-muted border-b text-[11px] font-semibold uppercase">
                <th className="py-2.5 pr-4">Member</th>
                <th className="py-2.5 pr-4">Workspace Role</th>
                <th className="py-2.5 pr-4">Team Role</th>
                <th className="py-2.5 pr-4">Joined</th>
                {canManageMembers && <th className="py-2.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {team.memberships.map((membership) => {
                const member = membership.user;
                const isThisMemberOwner = membership.role === TeamRole.OWNER;
                const isCurrentUserRow = member.id === currentUser.id;

                return (
                  <tr key={member.id} className="group hover:bg-background/50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-xs font-bold">
                          {(member.name?.[0] || member.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <div className="text-text font-semibold">
                            {member.name || "Unnamed Member"}
                            {isCurrentUserRow && (
                              <span className="text-muted ml-1.5 text-[10px]">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-muted text-[11px]">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <span className="text-muted font-medium">
                        {member.orgRole === OrgRole.ORG_OWNER
                          ? "Workspace Owner"
                          : member.orgRole === OrgRole.ORG_ADMIN
                            ? "Admin"
                            : "Member"}
                      </span>
                    </td>

                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          isThisMemberOwner
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/15 text-muted"
                        }`}
                      >
                        {isThisMemberOwner ? (
                          <>
                            <Shield className="size-3" />
                            <span>OWNER</span>
                          </>
                        ) : (
                          <span>MEMBER</span>
                        )}
                      </span>
                    </td>

                    <td className="text-muted py-3 pr-4 text-[11px]">
                      {new Date(membership.joinedAt).toLocaleDateString()}
                    </td>

                    {canManageMembers && (
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role Toggle Button (Team Owner or Org Owner only) */}
                          {(isTeamOwner || isOrgOwner) && (
                            <form action={roleFormAction}>
                              <input type="hidden" name="teamId" value={team.id} />
                              <input type="hidden" name="userId" value={member.id} />
                              <input
                                type="hidden"
                                name="role"
                                value={
                                  isThisMemberOwner
                                    ? TeamRole.MEMBER
                                    : TeamRole.OWNER
                                }
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="text-muted hover:text-text h-7 px-2 text-[11px]"
                              >
                                {isThisMemberOwner
                                  ? "Demote to Member"
                                  : "Promote to Owner"}
                              </Button>
                            </form>
                          )}

                          {/* Remove Member Button */}
                          <form
                            action={removeFormAction}
                            onSubmit={(e) => {
                              if (
                                !confirm(
                                  `Remove ${member.name || member.email} from this team?`
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="teamId" value={team.id} />
                            <input type="hidden" name="userId" value={member.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:text-danger hover:bg-danger/10 h-7 px-2 text-[11px]"
                            >
                              <UserMinus className="size-3.5" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">
                                Remove
                              </span>
                            </Button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Team Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <h2 className="text-text text-base font-bold">Edit Team</h2>
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
              <input type="hidden" name="teamId" value={team.id} />

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-team-project"
                  className="text-text block text-xs font-semibold"
                >
                  Parent Project
                </label>
                <select
                  id="edit-team-project"
                  name="projectId"
                  defaultValue={team.project.id}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                >
                  {orgProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-team-name"
                  className="text-text block text-xs font-semibold"
                >
                  Team Name
                </label>
                <input
                  id="edit-team-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={team.name}
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-team-description"
                  className="text-text block text-xs font-semibold"
                >
                  Description
                </label>
                <textarea
                  id="edit-team-description"
                  name="description"
                  rows={3}
                  defaultValue={team.description || ""}
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

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="text-primary size-5" />
                <h2 className="text-text text-base font-bold">
                  Add Member to Team
                </h2>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            {nonTeamOrgMembers.length === 0 ? (
              <div className="text-muted space-y-3 py-4 text-center text-xs">
                <p>All members of this workspace are already in this team.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            ) : (
              <form
                action={async (formData) => {
                  await addMemberFormAction(formData);
                  setIsAddMemberOpen(false);
                }}
                className="space-y-4"
              >
                <input type="hidden" name="teamId" value={team.id} />

                <div className="space-y-1.5">
                  <label
                    htmlFor="add-user-select"
                    className="text-text block text-xs font-semibold"
                  >
                    Select Member *
                  </label>
                  <select
                    id="add-user-select"
                    name="userId"
                    required
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    {nonTeamOrgMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="add-role-select"
                    className="text-text block text-xs font-semibold"
                  >
                    Team Role *
                  </label>
                  <select
                    id="add-role-select"
                    name="role"
                    defaultValue={TeamRole.MEMBER}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
                  >
                    <option value={TeamRole.MEMBER}>MEMBER (Standard)</option>
                    <option value={TeamRole.OWNER}>OWNER (Lead & Admin)</option>
                  </select>
                </div>

                <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddMemberOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddMemberPending}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs text-white"
                  >
                    {isAddMemberPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span>Add to Team</span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
