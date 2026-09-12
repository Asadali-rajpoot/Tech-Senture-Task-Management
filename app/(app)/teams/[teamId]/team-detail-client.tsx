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
import {
  createLabelAction,
  deleteLabelAction,
  type TaskActionResponse,
} from "@/app/(app)/tasks/actions";
import { OrgRole, TeamRole, ProjectDomain, TaskStatus, TaskPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tag,
  Search,
  Check,
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

export interface TeamLabelItem {
  id: string;
  name: string;
  color: string;
  createdAt?: Date;
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
  labels?: TeamLabelItem[];
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
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>(TeamRole.MEMBER);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberSuccess, setAddMemberSuccess] = useState<string | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Form action states
  const [updateState, updateFormAction, isUpdatePending] = useActionState<
    TeamActionResponse,
    FormData
  >(updateTeamAction, {});

  const [deleteState, deleteFormAction, isDeletePending] = useActionState<
    TeamActionResponse,
    FormData
  >(deleteTeamAction, {});

  const [roleState, roleFormAction] = useActionState<
    TeamActionResponse,
    FormData
  >(updateTeamMemberRoleAction, {});

  const [removeState, removeFormAction] = useActionState<
    TeamActionResponse,
    FormData
  >(removeTeamMemberAction, {});

  // Label management states
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [newLabelColor, setNewLabelColor] = useState("#6366F1");
  const [createLabelState, createLabelFormAction, isCreateLabelPending] =
    useActionState<TaskActionResponse, FormData>(createLabelAction, {});
  const [deleteLabelState, deleteLabelFormAction] = useActionState<
    TaskActionResponse,
    FormData
  >(deleteLabelAction, {});

  const PRESET_COLORS = [
    "#6366F1", // Primary Indigo
    "#8B5CF6", // Secondary Purple
    "#22C55E", // Success Green
    "#F59E0B", // Warning Amber
    "#EF4444", // Danger Red
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#84CC16", // Lime
  ];

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

  const filteredCandidates = nonTeamOrgMembers.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      (m.name?.toLowerCase().includes(q) ?? false) ||
      (m.email?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setAddMemberError("Please select a workspace member to add.");
      return;
    }
    setIsSubmittingMember(true);
    setAddMemberError(null);

    const formData = new FormData();
    formData.append("teamId", team.id);
    formData.append("userId", selectedUserId);
    formData.append("role", selectedRole);

    try {
      const res = await addTeamMemberAction({}, formData);
      if (res.error) {
        setAddMemberError(res.error);
        setIsSubmittingMember(false);
      } else {
        setIsAddMemberOpen(false);
        setSelectedUserId("");
        setMemberSearchQuery("");
        setSelectedRole(TeamRole.MEMBER);
        setAddMemberSuccess(res.success || "Member added successfully!");
        setIsSubmittingMember(false);
        router.refresh();
      }
    } catch (err) {
      setAddMemberError(
        err instanceof Error ? err.message : "Failed to add member to team"
      );
      setIsSubmittingMember(false);
    }
  };

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
      {addMemberSuccess && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{addMemberSuccess}</p>
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
      {createLabelState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{createLabelState.error}</p>
        </div>
      )}
      {createLabelState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{createLabelState.success}</p>
        </div>
      )}
      {deleteLabelState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{deleteLabelState.error}</p>
        </div>
      )}
      {deleteLabelState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{deleteLabelState.success}</p>
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
              onClick={() => {
                setAddMemberError(null);
                setMemberSearchQuery("");
                setSelectedUserId(nonTeamOrgMembers[0]?.id || "");
                setSelectedRole(TeamRole.MEMBER);
                setIsAddMemberOpen(true);
              }}
              size="sm"
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

      {/* Team Labels & Tags Management Section (PRD.md §6.5.5) */}
      <div className="border-border bg-card space-y-5 rounded-xl border p-6 shadow-xs">
        <div className="border-border flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="text-secondary size-4" />
              <h2 className="text-text text-base font-bold">Team Labels & Tags</h2>
            </div>
            <p className="text-muted text-xs">
              Color-coded labels for organizing and categorizing tasks within this team
            </p>
          </div>

          <Button
            onClick={() => setIsCreateLabelOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold text-white shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Create Label</span>
          </Button>
        </div>

        {/* Labels Grid */}
        {(!team.labels || team.labels.length === 0) ? (
          <div className="text-muted border-border/50 bg-background/50 rounded-lg border border-dashed py-8 text-center text-xs">
            <Tag className="text-muted/40 mx-auto size-7" />
            <p className="mt-2 font-medium">No labels created for this team yet.</p>
            <p className="text-muted/70 text-[11px]">
              Create labels (e.g. Bug, Feature, Urgent, Frontend) to tag your tasks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.labels.map((label) => (
              <div
                key={label.id}
                className="border-border bg-background/60 hover:bg-background group flex items-center justify-between rounded-xl border p-3.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-3 rounded-full shadow-xs"
                    style={{ backgroundColor: label.color }}
                  />
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                </div>

                <form
                  action={deleteLabelFormAction}
                  onSubmit={(e) => {
                    if (
                      !confirm(
                        `Are you sure you want to delete label "${label.name}"? It will be detached from all tasks.`
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="labelId" value={label.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-muted hover:text-danger opacity-60 group-hover:opacity-100 size-7 p-0 transition-opacity"
                    title="Delete label"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Label Modal */}
      {isCreateLabelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-card border-border animate-in fade-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border p-6 shadow-xl duration-150">
            <div className="border-border flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Tag className="text-secondary size-5" />
                <h2 className="text-text text-base font-bold">
                  Create Team Label
                </h2>
              </div>
              <button
                onClick={() => setIsCreateLabelOpen(false)}
                className="text-muted hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createLabelFormAction(formData);
                setIsCreateLabelOpen(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="teamId" value={team.id} />

              <div className="space-y-1.5">
                <label
                  htmlFor="create-label-name"
                  className="text-text block text-xs font-semibold"
                >
                  Label Name *
                </label>
                <input
                  id="create-label-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Bug, Feature, Urgency, DevOps"
                  className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-xs transition-all focus:ring-2 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text block text-xs font-semibold">
                  Color Token *
                </label>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewLabelColor(c)}
                      className={`size-7 rounded-full transition-transform ${
                        newLabelColor === c
                          ? "scale-110 ring-2 ring-primary ring-offset-2"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input type="hidden" name="color" value={newLabelColor} />
              </div>

              <div className="border-border flex items-center justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateLabelOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreateLabelPending}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-xs text-white"
                >
                  {isCreateLabelPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <span>Create Label</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Add Member Dialog */}
      <Dialog
        open={isAddMemberOpen}
        onOpenChange={(open) => {
          setIsAddMemberOpen(open);
          if (!open) {
            setAddMemberError(null);
            setMemberSearchQuery("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <UserPlus className="size-4" />
              </div>
              <div>
                <DialogTitle>Add Member to Team</DialogTitle>
                <DialogDescription>
                  Search and assign a workspace member to {team.name}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {addMemberError && (
            <div className="bg-danger/10 border-danger/20 text-danger flex items-start gap-2 rounded-lg border p-3 text-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{addMemberError}</span>
            </div>
          )}

          {nonTeamOrgMembers.length === 0 ? (
            <div className="text-muted space-y-3 py-6 text-center text-xs">
              <div className="bg-muted/10 mx-auto flex size-12 items-center justify-center rounded-full">
                <Users className="text-muted size-6" />
              </div>
              <p className="text-text font-medium">All workspace members are already in this team.</p>
              <p className="text-muted text-[11px]">
                To invite new people to your workspace, go to Members settings.
              </p>
              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="w-full text-xs sm:w-auto"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              {/* Member Search & Selection */}
              <div className="space-y-2">
                <label className="text-text block text-xs font-semibold">
                  Select Member *
                </label>

                {/* Search Input */}
                <div className="relative">
                  <Search className="text-muted absolute left-3 top-1/2 size-3.5 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 placeholder:text-muted w-full rounded-lg border py-2 pr-3 pl-8 text-xs focus:ring-2 focus:outline-none"
                  />
                </div>

                {/* Candidate Member List */}
                <div className="border-border divide-border max-h-48 divide-y overflow-y-auto rounded-lg border">
                  {filteredCandidates.length === 0 ? (
                    <div className="text-muted py-4 text-center text-xs">
                      No members found matching &ldquo;{memberSearchQuery}&rdquo;
                    </div>
                  ) : (
                    filteredCandidates.map((m) => {
                      const isSelected = selectedUserId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(m.id);
                            setAddMemberError(null);
                          }}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/5"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="bg-secondary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white">
                              {(m.name?.[0] || m.email?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-text truncate text-xs font-medium">
                                {m.name || m.email}
                              </p>
                              <p className="text-muted truncate text-[11px]">
                                {m.email}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-muted bg-muted/10 rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                              {m.orgRole === OrgRole.ORG_OWNER
                                ? "Owner"
                                : m.orgRole === OrgRole.ORG_ADMIN
                                ? "Admin"
                                : "Member"}
                            </span>
                            <div
                              className={`flex size-4 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border"
                              }`}
                            >
                              {isSelected && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Team Role Selection */}
              <div className="space-y-1.5">
                <label className="text-text block text-xs font-semibold">
                  Team Role *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole(TeamRole.MEMBER)}
                    className={`border-border flex flex-col rounded-lg border p-2.5 text-left transition-all ${
                      selectedRole === TeamRole.MEMBER
                        ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                        : "hover:bg-muted/5"
                    }`}
                  >
                    <span className="text-text text-xs font-semibold">MEMBER</span>
                    <span className="text-muted text-[11px]">Standard collaborator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(TeamRole.OWNER)}
                    className={`border-border flex flex-col rounded-lg border p-2.5 text-left transition-all ${
                      selectedRole === TeamRole.OWNER
                        ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                        : "hover:bg-muted/5"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Shield className="text-primary size-3" />
                      <span className="text-text text-xs font-semibold">OWNER</span>
                    </div>
                    <span className="text-muted text-[11px]">Lead & Admin</span>
                  </button>
                </div>
              </div>

              {/* Dialog Actions */}
              <DialogFooter className="gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(false)}
                  disabled={isSubmittingMember}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedUserId || isSubmittingMember}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-xs text-white"
                >
                  {isSubmittingMember ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add to Team</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
