import React from "react";
import { requireAuth } from "@/lib/api/proxy";
import { getOrgMembers, getOrgInvitations } from "@/lib/data/members";
import { MembersClient } from "./members-client";

export default async function MembersSettingsPage() {
  const session = await requireAuth();

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return null;
  }

  const members = await getOrgMembers(organizationId);
  const invitations = await getOrgInvitations(organizationId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <h1 className="text-text text-2xl font-bold tracking-tight">
          Team & Member Management
        </h1>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Manage workspace members, invite colleagues, and configure
          organization roles.
        </p>
      </div>

      <MembersClient
        members={members}
        invitations={invitations}
        currentUser={{
          id: session.user.id,
          orgRole: session.user.orgRole,
        }}
      />
    </div>
  );
}
