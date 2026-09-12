import { db } from "@/lib/db";
import { TaskPriority, TaskStatus } from "@prisma/client";

export interface GetOrgTasksOptions {
  teamId?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
}

export async function getOrgTasks(
  organizationId: string,
  options: GetOrgTasksOptions = {}
) {
  const { teamId, projectId, status, priority, assigneeId, search } = options;

  return db.task.findMany({
    where: {
      team: {
        id: teamId || undefined,
        project: {
          organizationId,
          id: projectId || undefined,
          isArchived: false,
        },
      },
      status: status || undefined,
      priority: priority || undefined,
      assigneeId:
        assigneeId !== undefined
          ? assigneeId === "UNASSIGNED"
            ? null
            : assigneeId
          : undefined,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          labels: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      labels: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          isCompleted: true,
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      dependencies: {
        include: {
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
          },
        },
      },
      dependents: {
        include: {
          dependentTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
          },
        },
      },
      timeEntries: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { loggedAt: "desc" },
      },
      activities: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          subtasks: true,
          comments: true,
          attachments: true,
          labels: true,
          dependencies: true,
          dependents: true,
          timeEntries: true,
          activities: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { position: "asc" },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getTaskById(organizationId: string, taskId: string) {
  return db.task.findFirst({
    where: {
      id: taskId,
      team: {
        project: {
          organizationId,
        },
      },
    },
    include: {
      team: {
        include: {
          project: true,
          labels: true,
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
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          orgRole: true,
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      subtasks: {
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      labels: true,
      attachments: {
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      dependencies: {
        include: {
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
          },
        },
      },
      dependents: {
        include: {
          dependentTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
          },
        },
      },
      timeEntries: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { loggedAt: "desc" },
      },
      activities: {
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getOrgTeamsWithMembers(organizationId: string) {
  return db.team.findMany({
    where: {
      project: {
        organizationId,
        isArchived: false,
      },
    },
    select: {
      id: true,
      name: true,
      labels: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
      memberships: {
        select: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}
