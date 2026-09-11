"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { withRole } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  revokeInvitationSchema,
} from "@/lib/validation/invitation";
import { sendInvitationEmail } from "@/lib/email/invitation";
import { OrgRole } from "@prisma/client";

export type ActionResponse = {
  error?: string;
  success?: string;
};

export async function inviteMemberAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = inviteMemberSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid invitation input",
    };
  }

  const { email, role } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ user, organizationId }) => {
        // 1. Check if user is already a member of this organization
        const existingMember = await db.user.findFirst({
          where: {
            email: email.toLowerCase(),
            organizationId,
          },
        });

        if (existingMember) {
          return {
            error: "This user is already a member of this organization.",
          };
        }

        // 2. Check if a pending invite already exists
        const existingInvite = await db.invitation.findFirst({
          where: {
            email: email.toLowerCase(),
            organizationId,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvite) {
          return {
            error:
              "A pending invitation has already been sent to this email address.",
          };
        }

        // 3. Generate secure token & expiry (7 days)
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const org = await db.organization.findUnique({
          where: { id: organizationId },
        });

        // 4. Create Invitation record
        await db.invitation.create({
          data: {
            email: email.toLowerCase(),
            role,
            token,
            expiresAt,
            organizationId,
            inviterId: user.id,
          },
        });

        const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${token}`;

        // 5. Send/log invitation email
        await sendInvitationEmail({
          toEmail: email,
          orgName: org?.name || "the workspace",
          inviterName: user.name || "A team member",
          inviteLink,
          role,
        });

        revalidatePath("/settings/members");
        return { success: `Invitation sent to ${email} successfully!` };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to send invitation",
    };
  }
}

export async function revokeInvitationAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = revokeInvitationSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid invitation ID" };
  }

  const { invitationId } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ organizationId }) => {
        await db.invitation.deleteMany({
          where: {
            id: invitationId,
            organizationId,
          },
        });

        revalidatePath("/settings/members");
        return { success: "Invitation revoked successfully." };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to revoke invitation",
    };
  }
}

export async function updateMemberRoleAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateMemberRoleSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid role selection",
    };
  }

  const { userId, role } = parsed.data;

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ user, organizationId }) => {
        const targetUser = await db.user.findFirst({
          where: { id: userId, organizationId },
        });

        if (!targetUser) {
          return { error: "Member not found in this organization." };
        }

        // Security check: Only ORG_OWNER can promote/demote ORG_ADMIN or transfer ORG_OWNER
        if (user.orgRole !== "ORG_OWNER") {
          if (
            targetUser.orgRole === "ORG_OWNER" ||
            targetUser.orgRole === "ORG_ADMIN" ||
            role === "ORG_OWNER" ||
            role === "ORG_ADMIN"
          ) {
            return {
              error:
                "Only Organization Owners can manage Admin or Owner roles.",
            };
          }
        }

        // Prevent demoting the last owner
        if (targetUser.orgRole === "ORG_OWNER" && role !== "ORG_OWNER") {
          const ownerCount = await db.user.count({
            where: { organizationId, orgRole: OrgRole.ORG_OWNER },
          });
          if (ownerCount <= 1) {
            return { error: "Cannot remove the only Organization Owner." };
          }
        }

        await db.user.update({
          where: { id: userId },
          data: { orgRole: role },
        });

        revalidatePath("/settings/members");
        return {
          success: `Role updated to ${role} for ${targetUser.name || targetUser.email}.`,
        };
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update member role",
    };
  }
}

export async function removeMemberAction(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const userId = formData.get("userId") as string;
  if (!userId) {
    return { error: "User ID is required" };
  }

  try {
    return await withRole(
      ["ORG_OWNER", "ORG_ADMIN"],
      async ({ user, organizationId }) => {
        const targetUser = await db.user.findFirst({
          where: { id: userId, organizationId },
        });

        if (!targetUser) {
          return { error: "Member not found." };
        }

        if (targetUser.id === user.id) {
          return { error: "You cannot remove yourself from the organization." };
        }

        if (
          targetUser.orgRole === "ORG_OWNER" &&
          user.orgRole !== "ORG_OWNER"
        ) {
          return {
            error: "Only Organization Owners can remove another Owner.",
          };
        }

        // Remove from organization and cleanup team memberships in this org
        await db.membership.deleteMany({
          where: {
            userId: targetUser.id,
            team: { project: { organizationId } },
          },
        });

        await db.user.update({
          where: { id: targetUser.id },
          data: {
            organizationId: null,
            orgRole: OrgRole.ORG_MEMBER,
          },
        });

        revalidatePath("/settings/members");
        return {
          success: `${targetUser.name || targetUser.email} has been removed from the organization.`,
        };
      }
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
