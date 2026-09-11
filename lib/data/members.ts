import { db } from "@/lib/db";

export async function getOrgMembers(organizationId: string) {
  return db.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      orgRole: true,
      createdAt: true,
      memberships: {
        select: {
          id: true,
          role: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ orgRole: "asc" }, { createdAt: "asc" }],
  });
}

export async function getOrgInvitations(organizationId: string) {
  return db.invitation.findMany({
    where: {
      organizationId,
      expiresAt: { gt: new Date() },
    },
    include: {
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvitationByToken(token: string) {
  return db.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}
