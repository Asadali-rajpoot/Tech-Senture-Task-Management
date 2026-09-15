import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/api/proxy";
import {
  getTeamById,
  getOrgProjectsForSelect,
  getOrgMembersForTeamSelect,
} from "@/lib/data/teams";
import { TeamDetailClient } from "./team-detail-client";
import { Metadata } from "next";

interface TeamDetailPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export async function generateMetadata({
  params,
}: TeamDetailPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const session = await requireOrg();
  const team = await getTeamById(session.user.organizationId, teamId);

  return {
    title: team ? `${team.name} | PROXima` : "Team Details | PROXima",
    description: team?.description || "Manage team members and task assignments.",
  };
}

export default async function TeamDetailPage({
  params,
}: TeamDetailPageProps) {
  const { teamId } = await params;
  const session = await requireOrg();
  const organizationId = session.user.organizationId;

  const [team, orgProjects, availableOrgMembers] = await Promise.all([
    getTeamById(organizationId, teamId),
    getOrgProjectsForSelect(organizationId),
    getOrgMembersForTeamSelect(organizationId),
  ]);

  if (!team) {
    notFound();
  }

  return (
    <TeamDetailClient
      team={team}
      orgProjects={orgProjects}
      availableOrgMembers={availableOrgMembers}
      currentUser={{
        id: session.user.id,
        orgRole: session.user.orgRole,
      }}
    />
  );
}
