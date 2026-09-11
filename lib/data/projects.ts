import { db } from "@/lib/db";
import { ProjectDomain } from "@prisma/client";

interface GetOrgProjectsOptions {
  includeArchived?: boolean;
  domain?: ProjectDomain;
  search?: string;
}

export async function getOrgProjects(
  organizationId: string,
  options: GetOrgProjectsOptions = {}
) {
  const { includeArchived = false, domain, search } = options;

  return db.project.findMany({
    where: {
      organizationId,
      isArchived: includeArchived ? undefined : false,
      domain: domain ? domain : undefined,
      name: search
        ? {
            contains: search,
            mode: "insensitive",
          }
        : undefined,
    },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              memberships: true,
              tasks: true,
            },
          },
        },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(
  organizationId: string,
  projectId: string
) {
  return db.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    include: {
      teams: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              memberships: true,
              tasks: true,
            },
          },
        },
      },
      _count: {
        select: {
          teams: true,
        },
      },
    },
  });
}
