"use client";

import React, { useActionState } from "react";
import {
  inviteMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  removeMemberAction,
  type ActionResponse,
} from "./actions";
import { OrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Mail,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  orgRole: OrgRole;
  createdAt: Date;
  memberships: {
    id: string;
    role: string;
    team: {
      id: string;
      name: string;
    };
  }[];
}

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: Date;
  createdAt: Date;
  inviter: {
    name: string | null;
    email: string | null;
  };
}

interface MembersClientProps {
  members: Member[];
  invitations: Invitation[];
  currentUser: {
    id: string;
    orgRole: OrgRole;
  };
}

export function MembersClient({
  members,
  invitations,
  currentUser,
}: MembersClientProps) {
  const [inviteState, inviteFormAction, isInvitePending] = useActionState<
    ActionResponse,
    FormData
  >(inviteMemberAction, {});

  const [roleState, roleFormAction] = useActionState<ActionResponse, FormData>(
    updateMemberRoleAction,
    {}
  );

  const [revokeState, revokeFormAction] = useActionState<
    ActionResponse,
    FormData
  >(revokeInvitationAction, {});

  const [removeState, removeFormAction] = useActionState<
    ActionResponse,
    FormData
  >(removeMemberAction, {});

  const isOwner = currentUser.orgRole === OrgRole.ORG_OWNER;
  const isOwnerOrAdmin = isOwner || currentUser.orgRole === OrgRole.ORG_ADMIN;

  return (
    <div className="space-y-8">
      {/* Global Alerts for Actions */}
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
      {revokeState?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{revokeState.success}</p>
        </div>
      )}

      {/* Invite Member Section (Restricted to ORG_OWNER / ORG_ADMIN) */}
      {isOwnerOrAdmin && (
        <div className="border-border bg-card space-y-4 rounded-xl border p-6 shadow-xs">
          <div className="border-border flex items-center gap-2.5 border-b pb-3">
            <UserPlus className="text-primary size-4" />
            <h2 className="text-text text-sm font-semibold">
              Invite Team Member
            </h2>
          </div>

          {inviteState?.error && (
            <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3 text-xs">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{inviteState.error}</p>
            </div>
          )}

          {inviteState?.success && (
            <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3 text-xs">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>{inviteState.success}</p>
            </div>
          )}

          <form
            action={inviteFormAction}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Mail className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                placeholder="colleague@company.com"
                className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-xs transition-all focus:ring-2 focus:outline-none"
              />
            </div>

            <select
              name="role"
              defaultValue={OrgRole.ORG_MEMBER}
              className="border-border bg-background text-text focus:border-primary focus:ring-primary/20 rounded-lg border px-3 py-2 text-xs focus:ring-2 focus:outline-none"
            >
              <option value={OrgRole.ORG_MEMBER}>Member (ORG_MEMBER)</option>
              {isOwner && (
                <option value={OrgRole.ORG_ADMIN}>Admin (ORG_ADMIN)</option>
              )}
            </select>

            <Button
              type="submit"
              disabled={isInvitePending}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 text-xs text-white"
            >
              {isInvitePending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              <span>Send Invite</span>
            </Button>
          </form>
        </div>
      )}

      {/* Active Members Table */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xs">
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-text text-sm font-semibold">
              Workspace Members
            </h2>
            <p className="text-muted text-xs">
              {members.length} {members.length === 1 ? "person" : "people"}{" "}
              working across your workspace
            </p>
          </div>
        </div>

        <div className="divide-border divide-y">
          {members.map((member) => {
            const isSelf = member.id === currentUser.id;
            const canManageThisMember =
              isOwner ||
              (isOwnerOrAdmin && member.orgRole === OrgRole.ORG_MEMBER);

            return (
              <div
                key={member.id}
                className="hover:bg-background/50 flex flex-col justify-between gap-4 px-6 py-4 transition-colors sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                    {member.name
                      ? member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-text text-sm font-semibold">
                        {member.name || "Unnamed Member"}
                      </span>
                      {isSelf && (
                        <span className="bg-muted/20 text-muted rounded px-1.5 py-0.5 text-[10px] font-semibold">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-xs">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Indicator / Management Dropdown */}
                  {canManageThisMember && !isSelf ? (
                    <form
                      action={roleFormAction}
                      className="inline-flex items-center"
                    >
                      <input type="hidden" name="userId" value={member.id} />
                      <select
                        name="role"
                        defaultValue={member.orgRole}
                        onChange={(e) => e.target.form?.requestSubmit()}
                        className="border-border bg-background text-text focus:border-primary focus:ring-primary rounded-lg border px-2.5 py-1 text-xs font-medium focus:ring-1 focus:outline-none"
                      >
                        <option value={OrgRole.ORG_MEMBER}>Member</option>
                        <option value={OrgRole.ORG_ADMIN}>Admin</option>
                        {isOwner && (
                          <option value={OrgRole.ORG_OWNER}>Owner</option>
                        )}
                      </select>
                    </form>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.orgRole === OrgRole.ORG_OWNER
                          ? "bg-primary/10 text-primary font-semibold"
                          : member.orgRole === OrgRole.ORG_ADMIN
                            ? "bg-secondary/10 text-secondary font-semibold"
                            : "bg-muted/10 text-muted"
                      }`}
                    >
                      {member.orgRole}
                    </span>
                  )}

                  {/* Remove Member Action */}
                  {canManageThisMember && !isSelf && (
                    <form action={removeFormAction}>
                      <input type="hidden" name="userId" value={member.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        className="text-muted hover:text-danger hover:bg-danger/10 size-8"
                        title="Remove member"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations Section */}
      {isOwnerOrAdmin && invitations.length > 0 && (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-xs">
          <div className="border-border border-b px-6 py-4">
            <h2 className="text-text text-sm font-semibold">
              Pending Invitations
            </h2>
            <p className="text-muted text-xs">
              {invitations.length} invite{invitations.length === 1 ? "" : "s"}{" "}
              awaiting acceptance
            </p>
          </div>

          <div className="divide-border divide-y">
            {invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col justify-between gap-3 px-6 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-warning/10 text-warning flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <span className="text-text block text-xs font-semibold">
                      {invite.email}
                    </span>
                    <span className="text-muted text-[11px]">
                      Invited as{" "}
                      <strong className="text-text">{invite.role}</strong> by{" "}
                      {invite.inviter.name || invite.inviter.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-warning/10 text-warning rounded px-2 py-0.5 text-[10px] font-semibold">
                    Pending
                  </span>
                  <form action={revokeFormAction}>
                    <input
                      type="hidden"
                      name="invitationId"
                      value={invite.id}
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:text-danger hover:bg-danger/10 h-7 px-2 text-xs"
                    >
                      Revoke
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
