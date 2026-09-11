"use server";

import { revalidatePath } from "next/cache";
import { withOrgScope } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { OrgRole, TeamRole } from "@prisma/client";
import {
  createTeamSchema,
  updateTeamSchema,
  deleteTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberRoleSchema,
  removeTeamMemberSchema,
} from "@/lib/validation/team";

export type TeamActionResponse = {
  error?: string;
  success?: string;
  teamId?: string;
};

/**
 * Creates a new team under a parent project.
 * Automatically adds the creator as a Team OWNER.
 */
export async function createTeamAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createTeamSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid team details",
    };
  }

  const { name, description, projectId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      // Validate parent project belongs to this organization
      const project = await db.project.findFirst({
        where: { id: projectId, organizationId },
      });

      if (!project) {
        return { error: "Parent project not found in this workspace." };
      }

      // Create team and owner membership in transaction
      const team = await db.$transaction(async (tx) => {
        const newTeam = await tx.team.create({
          data: {
            name,
            description: description || null,
            projectId,
            creatorId: user.id,
          },
        });

        await tx.membership.create({
          data: {
            userId: user.id,
            teamId: newTeam.id,
            role: TeamRole.OWNER,
          },
        });

        return newTeam;
      });

      revalidatePath("/teams");
      revalidatePath("/projects");
      revalidatePath(`/projects/${projectId}`);
      revalidatePath("/dashboard");

      return {
        success: `Team "${team.name}" created successfully!`,
        teamId: team.id,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create team",
    };
  }
}

/**
 * Updates team details (name, description, or parent project).
 * Allowed for Team OWNER, ORG_OWNER, or ORG_ADMIN.
 */
export async function updateTeamAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateTeamSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid team details",
    };
  }

  const { teamId, name, description, projectId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
        include: {
          memberships: {
            where: { userId: user.id },
          },
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const userMembership = team.memberships[0];
      const isTeamOwner = userMembership?.role === TeamRole.OWNER;
      const isOrgAdminOrOwner =
        user.orgRole === OrgRole.ORG_OWNER ||
        user.orgRole === OrgRole.ORG_ADMIN;

      if (!isTeamOwner && !isOrgAdminOrOwner) {
        return { error: "You do not have permission to edit this team." };
      }

      if (projectId && projectId !== team.projectId) {
        const newProject = await db.project.findFirst({
          where: { id: projectId, organizationId },
        });
        if (!newProject) {
          return { error: "Target project not found in this workspace." };
        }
      }

      await db.team.update({
        where: { id: teamId },
        data: {
          name,
          description: description || null,
          projectId: projectId || undefined,
        },
      });

      revalidatePath("/teams");
      revalidatePath(`/teams/${teamId}`);
      revalidatePath("/projects");
      return { success: `Team "${name}" updated successfully!` };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update team",
    };
  }
}

/**
 * Deletes a team.
 * Strictly restricted to Team OWNER or ORG_OWNER per PRD §6.3.2.
 */
export async function deleteTeamAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteTeamSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid team delete request" };
  }

  const { teamId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
        include: {
          memberships: {
            where: { userId: user.id },
          },
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const userMembership = team.memberships[0];
      const isTeamOwner = userMembership?.role === TeamRole.OWNER;
      const isOrgOwner = user.orgRole === OrgRole.ORG_OWNER;

      if (!isTeamOwner && !isOrgOwner) {
        return {
          error:
            "Permission denied. Only Team Owners or Organization Owners can delete a team.",
        };
      }

      await db.team.delete({
        where: { id: teamId },
      });

      revalidatePath("/teams");
      revalidatePath("/projects");
      revalidatePath("/dashboard");

      return { success: `Team "${team.name}" was deleted successfully.` };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete team",
    };
  }
}

/**
 * Adds an organization member to the team.
 * Allowed for Team OWNER, ORG_OWNER, or ORG_ADMIN.
 */
export async function addTeamMemberAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = addTeamMemberSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid member addition data",
    };
  }

  const { teamId, userId, role } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      // Check team existence and caller permissions
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
        include: {
          memberships: {
            where: { userId: user.id },
          },
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const userMembership = team.memberships[0];
      const isTeamOwner = userMembership?.role === TeamRole.OWNER;
      const isOrgAdminOrOwner =
        user.orgRole === OrgRole.ORG_OWNER ||
        user.orgRole === OrgRole.ORG_ADMIN;

      if (!isTeamOwner && !isOrgAdminOrOwner) {
        return {
          error: "Only Team Owners or Organization Admins can add members.",
        };
      }

      // Check target user belongs to the same org
      const targetUser = await db.user.findFirst({
        where: { id: userId, organizationId },
      });

      if (!targetUser) {
        return { error: "User is not a member of this workspace." };
      }

      // Check if already in team
      const existingMembership = await db.membership.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      if (existingMembership) {
        return { error: "User is already a member of this team." };
      }

      await db.membership.create({
        data: {
          userId,
          teamId,
          role,
        },
      });

      revalidatePath(`/teams/${teamId}`);
      revalidatePath("/teams");
      return {
        success: `${targetUser.name || targetUser.email} added to team!`,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add member",
    };
  }
}

/**
 * Updates a member's role within the team (OWNER <-> MEMBER).
 * Allowed for Team OWNER or ORG_OWNER.
 */
export async function updateTeamMemberRoleAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateTeamMemberRoleSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid role update request" };
  }

  const { teamId, userId, role } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
        include: {
          memberships: true,
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const callerMembership = team.memberships.find(
        (m) => m.userId === user.id
      );
      const isTeamOwner = callerMembership?.role === TeamRole.OWNER;
      const isOrgOwner = user.orgRole === OrgRole.ORG_OWNER;

      if (!isTeamOwner && !isOrgOwner) {
        return {
          error: "Only Team Owners or Workspace Owners can change team roles.",
        };
      }

      const targetMembership = team.memberships.find(
        (m) => m.userId === userId
      );
      if (!targetMembership) {
        return { error: "Target member not found in this team." };
      }

      // Prevent demoting the only Team Owner
      if (
        targetMembership.role === TeamRole.OWNER &&
        role === TeamRole.MEMBER
      ) {
        const ownerCount = team.memberships.filter(
          (m) => m.role === TeamRole.OWNER
        ).length;
        if (ownerCount <= 1) {
          return {
            error:
              "Cannot demote the only Team Owner. Assign another owner first.",
          };
        }
      }

      await db.membership.update({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
        data: { role },
      });

      revalidatePath(`/teams/${teamId}`);
      revalidatePath("/teams");
      return { success: "Team member role updated successfully." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update member role",
    };
  }
}

/**
 * Removes a member from the team.
 * Allowed for Team OWNER, ORG_OWNER, or the user removing themselves.
 */
export async function removeTeamMemberAction(
  _prevState: TeamActionResponse,
  formData: FormData
): Promise<TeamActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = removeTeamMemberSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid member removal request" };
  }

  const { teamId, userId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
        include: {
          memberships: true,
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const callerMembership = team.memberships.find(
        (m) => m.userId === user.id
      );
      const isTeamOwner = callerMembership?.role === TeamRole.OWNER;
      const isOrgOwner = user.orgRole === OrgRole.ORG_OWNER;
      const isSelf = user.id === userId;

      if (!isTeamOwner && !isOrgOwner && !isSelf) {
        return {
          error: "You do not have permission to remove this member.",
        };
      }

      const targetMembership = team.memberships.find(
        (m) => m.userId === userId
      );
      if (!targetMembership) {
        return { error: "Member is not in this team." };
      }

      // Check if trying to remove the only Team Owner
      if (targetMembership.role === TeamRole.OWNER) {
        const ownerCount = team.memberships.filter(
          (m) => m.role === TeamRole.OWNER
        ).length;
        if (ownerCount <= 1) {
          return {
            error:
              "Cannot remove the only Team Owner. Assign another owner before leaving.",
          };
        }
      }

      await db.membership.delete({
        where: {
          userId_teamId: {
            userId,
            teamId,
          },
        },
      });

      revalidatePath(`/teams/${teamId}`);
      revalidatePath("/teams");
      return { success: "Member removed from team." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
