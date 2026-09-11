import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name is too long"),
  teamSize: z
    .enum(["1-5", "6-15", "16-50", "50+"], {
      message: "Please select your team size",
    })
    .optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name is too long"),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
