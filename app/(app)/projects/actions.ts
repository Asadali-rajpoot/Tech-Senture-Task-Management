"use server";

import { revalidatePath } from "next/cache";
import { withRole } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import {
  createProjectSchema,
  updateProjectSchema,
  toggleArchiveProjectSchema,
  deleteProjectSchema,
} from "@/lib/validation/project";

export type ProjectActionResponse = {
  error?: string;
  success?: string;
  projectId?: string;
};

export async function createProjectAction(
  _prevState: ProjectActionResponse,
  formData: FormData
): Promise<ProjectActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createProjectSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid project details",
    };
  }

  const { name, description, domain } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        const project = await db.project.create({
          data: {
            name,
            description: description || null,
            domain,
            organizationId,
          },
        });

        revalidatePath("/projects");
        revalidatePath("/dashboard");
        return {
          success: `Project "${project.name}" created successfully!`,
          projectId: project.id,
        };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

export async function updateProjectAction(
  _prevState: ProjectActionResponse,
  formData: FormData
): Promise<ProjectActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateProjectSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid project details",
    };
  }

  const { projectId, name, description, domain } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        const project = await db.project.findFirst({
          where: { id: projectId, organizationId },
        });

        if (!project) {
          return { error: "Project not found in this organization." };
        }

        await db.project.update({
          where: { id: projectId },
          data: {
            name,
            description: description || null,
            domain,
          },
        });

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return { success: `Project updated successfully!` };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

export async function toggleArchiveProjectAction(
  _prevState: ProjectActionResponse,
  formData: FormData
): Promise<ProjectActionResponse> {
  const projectId = formData.get("projectId") as string;
  const isArchived = formData.get("isArchived") === "true";

  const parsed = toggleArchiveProjectSchema.safeParse({
    projectId,
    isArchived,
  });
  if (!parsed.success) {
    return { error: "Invalid project archive request" };
  }

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        const project = await db.project.findFirst({
          where: { id: projectId, organizationId },
        });

        if (!project) {
          return { error: "Project not found." };
        }

        await db.project.update({
          where: { id: projectId },
          data: { isArchived },
        });

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);
        return {
          success: isArchived
            ? `Project "${project.name}" archived.`
            : `Project "${project.name}" unarchived.`,
        };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to change archive status",
    };
  }
}

export async function deleteProjectAction(
  _prevState: ProjectActionResponse,
  formData: FormData
): Promise<ProjectActionResponse> {
  const projectId = formData.get("projectId") as string;
  const parsed = deleteProjectSchema.safeParse({ projectId });

  if (!parsed.success) {
    return { error: "Invalid project ID" };
  }

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        const project = await db.project.findFirst({
          where: { id: projectId, organizationId },
        });

        if (!project) {
          return { error: "Project not found." };
        }

        await db.project.delete({
          where: { id: projectId },
        });

        revalidatePath("/projects");
        revalidatePath("/dashboard");
        return { success: `Project "${project.name}" deleted successfully.` };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}
