import React from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/api/proxy";
import { getProjectById } from "@/lib/data/projects";
import { ProjectDetailClient } from "./project-detail-client";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await requireAuth();

  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return null;
  }

  const project = await getProjectById(organizationId, projectId);
  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <ProjectDetailClient
        project={project}
        currentUser={{
          id: session.user.id,
          orgRole: session.user.orgRole,
        }}
      />
    </div>
  );
}
