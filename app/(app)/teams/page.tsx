import { requireOrg } from "@/lib/api/proxy";
import { getOrgTeams, getOrgProjectsForSelect } from "@/lib/data/teams";
import { TeamsClient } from "./teams-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teams | Tech Senture",
  description: "Manage organizational teams, members, and project assignments.",
};

export default async function TeamsPage() {
  const session = await requireOrg();
  const organizationId = session.user.organizationId;

  const [teams, projects] = await Promise.all([
    getOrgTeams(organizationId),
    getOrgProjectsForSelect(organizationId),
  ]);

  return (
    <TeamsClient
      initialTeams={teams}
      projects={projects}
      currentUser={{
        id: session.user.id,
        orgRole: session.user.orgRole,
      }}
    />
  );
}
