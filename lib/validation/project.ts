import { z } from "zod";
import { ProjectDomain } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  domain: z
    .nativeEnum(ProjectDomain, {
      message: "Please select a valid project domain",
    })
    .default(ProjectDomain.DEVELOPMENT),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  domain: z.nativeEnum(ProjectDomain, {
    message: "Please select a valid project domain",
  }),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const toggleArchiveProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  isArchived: z.boolean(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});
