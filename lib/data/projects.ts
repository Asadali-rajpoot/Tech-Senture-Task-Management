import { db } from "@/lib/db";
import { ProjectDomain, TaskStatus } from "@prisma/client";

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
  const project = await db.project.findFirst({
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
          tasks: {
            select: {
              id: true,
              status: true,
              priority: true,
              dueDate: true,
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

  if (!project) return null;

  // Aggregate project-level task metrics (PRD.md §6.2.4)
  const allTasks = project.teams.flatMap((t) => t.tasks);
  const totalTasks = allTasks.length;
  const todoTasks = allTasks.filter((t) => t.status === TaskStatus.TODO).length;
  const inProgressTasks = allTasks.filter(
    (t) => t.status === TaskStatus.IN_PROGRESS
  ).length;
  const doneTasks = allTasks.filter((t) => t.status === TaskStatus.DONE).length;

  const now = new Date();
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE
  ).length;

  const completionPercentage =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    ...project,
    metrics: {
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
      completionPercentage,
    },
  };
}
