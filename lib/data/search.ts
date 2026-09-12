import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, ProjectDomain } from "@prisma/client";

export interface SearchTaskResult {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  team: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
      domain: ProjectDomain;
    };
  };
  assignee: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  description: string | null;
  domain: ProjectDomain;
  isArchived: boolean;
  teamsCount: number;
}

export interface SearchTeamResult {
  id: string;
  name: string;
  description: string | null;
  project: {
    id: string;
    name: string;
    domain: ProjectDomain;
  };
  membersCount: number;
  tasksCount: number;
}

export interface GlobalSearchResults {
  tasks: SearchTaskResult[];
  projects: SearchProjectResult[];
  teams: SearchTeamResult[];
  totalMatches: number;
}

/**
 * Searches across Tasks, Projects, and Teams strictly scoped to the specified organizationId.
 * Complies with PRD §6.7.2 and ARCHITECTURE §2 multi-tenant isolation.
 */
export async function searchOrganization(
  organizationId: string,
  query: string,
  limit: number = 8
): Promise<GlobalSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { tasks: [], projects: [], teams: [], totalMatches: 0 };
  }

  const [tasks, projects, teams] = await Promise.all([
    // Tasks search scoped to organization
    db.task.findMany({
      where: {
        team: {
          project: {
            organizationId,
          },
        },
        OR: [
          { title: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        team: {
          select: {
            id: true,
            name: true,
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
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),

    // Projects search scoped to organization
    db.project.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        domain: true,
        isArchived: true,
        _count: {
          select: {
            teams: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),

    // Teams search scoped to organization
    db.team.findMany({
      where: {
        project: {
          organizationId,
        },
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { description: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        project: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            tasks: true,
          },
        },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const formattedProjects: SearchProjectResult[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    domain: p.domain,
    isArchived: p.isArchived,
    teamsCount: p._count.teams,
  }));

  const formattedTeams: SearchTeamResult[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    project: t.project,
    membersCount: t._count.memberships,
    tasksCount: t._count.tasks,
  }));

  const totalMatches = tasks.length + formattedProjects.length + formattedTeams.length;

  return {
    tasks,
    projects: formattedProjects,
    teams: formattedTeams,
    totalMatches,
  };
}
