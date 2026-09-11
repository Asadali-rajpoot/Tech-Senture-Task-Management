import React from "react";
import { requireAuth } from "@/lib/api/proxy";
import { getOrgProjects } from "@/lib/data/projects";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const session = await requireAuth();

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return null;
  }

  const projects = await getOrgProjects(organizationId, {
    includeArchived: true,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ProjectsClient
        projects={projects}
        currentUser={{
          id: session.user.id,
          orgRole: session.user.orgRole,
        }}
      />
    </div>
  );
}
