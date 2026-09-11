"use server";

import { redirect } from "next/navigation";
import { withAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { createOrganizationSchema } from "@/lib/validation/organization";
import { OrgRole } from "@prisma/client";

export async function createWorkspaceAction(
  _prevState: unknown,
  formData: FormData
) {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createOrganizationSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid workspace details",
    };
  }

  const { name } = parsed.data;

  try {
    await withAuth(async ({ user }) => {
      // Generate slug from workspace name
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      // Create organization and set user as ORG_OWNER
      const org = await db.organization.create({
        data: {
          name,
          slug,
        },
      });

      await db.user.update({
        where: { id: user.id },
        data: {
          organizationId: org.id,
          orgRole: OrgRole.ORG_OWNER,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return {
      error:
        error instanceof Error ? error.message : "Failed to create workspace",
    };
  }

  redirect("/dashboard");
}
