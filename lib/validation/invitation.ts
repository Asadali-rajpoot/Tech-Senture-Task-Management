import { z } from "zod";
import { OrgRole } from "@prisma/client";

export const inviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z
    .enum([OrgRole.ORG_ADMIN, OrgRole.ORG_MEMBER], {
      message: "Invalid organization role",
    })
    .default(OrgRole.ORG_MEMBER),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum([OrgRole.ORG_ADMIN, OrgRole.ORG_MEMBER, OrgRole.ORG_OWNER], {
    message: "Invalid organization role",
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const revokeInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});
