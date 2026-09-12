import { z } from "zod";

export const updateAdminBrandingSchema = z.object({
  appName: z
    .string()
    .min(2, "Application name must be at least 2 characters")
    .max(50, "Application name is too long"),
});

export type UpdateAdminBrandingInput = z.infer<typeof updateAdminBrandingSchema>;
