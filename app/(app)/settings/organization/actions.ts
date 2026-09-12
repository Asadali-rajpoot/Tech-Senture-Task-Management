"use server";

import { revalidatePath } from "next/cache";
import { withRole } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { updateOrganizationSchema } from "@/lib/validation/organization";
import { updateAdminBrandingSchema } from "@/lib/validation/branding";

export type UpdateOrgState = {
  error?: string;
  success?: string;
};

export async function updateOrganizationAction(
  _prevState: UpdateOrgState,
  formData: FormData
): Promise<UpdateOrgState> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateOrganizationSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid organization details",
    };
  }

  const { name } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        await db.organization.update({
          where: { id: organizationId },
          data: { name },
        });

        revalidatePath("/settings/organization");
        revalidatePath("/dashboard");
        return { success: "Workspace profile updated successfully!" };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update workspace",
    };
  }
}

export async function updateAdminBrandingAction(
  _prevState: UpdateOrgState,
  formData: FormData
): Promise<UpdateOrgState> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateAdminBrandingSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid application name",
    };
  }

  const { appName } = parsed.data;

  try {
    return await withRole(["ORG_OWNER"], async () => {
      const existing = await db.appSettings.findFirst();
      if (existing) {
        await db.appSettings.update({
          where: { id: existing.id },
          data: { appName },
        });
      } else {
        await db.appSettings.create({
          data: { appName },
        });
      }

      // Revalidate layout and all app pages so the branding reflects immediately everywhere
      revalidatePath("/", "layout");
      revalidatePath("/settings/organization");
      revalidatePath("/dashboard");

      return { success: "Application branding updated successfully!" };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update application branding",
    };
  }
}
