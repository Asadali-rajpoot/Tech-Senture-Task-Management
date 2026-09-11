import { db } from "@/lib/db";

interface GetOrgTeamsOptions {
  projectId?: string;
  search?: string;
}

export async function getOrgTeams(
  organizationId: string,
  options: GetOrgTeamsOptions = {}
) {
  const { projectId, search } = options;

  return db.team.findMany({
    where: {
      project: {
        organizationId,
        isArchived: false,
        id: projectId ? projectId : undefined,
      },
      name: search
        ? {
            contains: search,
            mode: "insensitive",
          }
        : undefined,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          domain: true,
          isArchived: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              orgRole: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: {
        select: {
          memberships: true,
          tasks: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTeamById(organizationId: string, teamId: string) {
  return db.team.findFirst({
    where: {
      id: teamId,
      project: {
        organizationId,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          domain: true,
          isArchived: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              orgRole: true,
            },
          },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 10,
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          memberships: true,
          tasks: true,
        },
      },
    },
  });
}

export async function getOrgProjectsForSelect(organizationId: string) {
  return db.project.findMany({
    where: {
      organizationId,
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      domain: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getOrgMembersForTeamSelect(organizationId: string) {
  return db.user.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      orgRole: true,
    },
    orderBy: { name: "asc" },
  });
}
