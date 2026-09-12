import { db } from "@/lib/db";
import { TaskStatus, TaskPriority, ProjectDomain, OrgRole } from "@prisma/client";

export type WorkloadStatus = "OVER_ALLOCATED" | "BALANCED" | "UNDER_ALLOCATED";

export interface MemberWorkloadData {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  orgRole: OrgRole;
  totalAssignedTasks: number;
  activeTasksCount: number;
  inProgressCount: number;
  todoCount: number;
  doneCount: number;
  overdueCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  workloadStatus: WorkloadStatus;
  statusBadge: {
    label: string;
    color: string;
    bg: string;
    border: string;
  };
  assignedActiveTasks: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    estimatedHours: number | null;
    teamName: string;
  }[];
}

export interface TeamWorkloadData {
  teamId: string;
  name: string;
  projectName: string;
  projectDomain: ProjectDomain;
  membersCount: number;
  totalTasks: number;
  activeTasks: number;
  doneTasks: number;
  overdueTasks: number;
  totalEstimatedHours: number;
  totalLoggedHours: number;
  tasksPerMember: number;
}

export interface OrgAnalyticsSummary {
  taskStatus: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    completionRate: number;
  };
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  overdue: {
    total: number;
    highPriorityOverdue: number;
  };
  timeTracking: {
    totalEstimatedHours: number;
    totalLoggedHours: number;
    loggedMinutes: number;
  };
  activeProjectsCount: number;
  activeTeamsCount: number;
  membersWorkload: MemberWorkloadData[];
  teamsWorkload: TeamWorkloadData[];
}

/**
 * Calculates comprehensive analytics, status breakdown, and workload allocations
 * for the given organization.
 */
export async function getOrgAnalytics(
  organizationId: string
): Promise<OrgAnalyticsSummary> {
  const now = new Date();

  // Fetch all tasks, projects, teams, and members in the organization
  const [tasks, projects, teams, members, timeEntries] = await Promise.all([
    // Org tasks with team, project, assignee, and time entries
    db.task.findMany({
      where: {
        team: {
          project: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        estimatedHours: true,
        assigneeId: true,
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
            projectId: true,
            project: {
              select: {
                id: true,
                name: true,
                domain: true,
                isArchived: true,
              },
            },
          },
        },
      },
    }),

    // Org active projects
    db.project.findMany({
      where: {
        organizationId,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    }),

    // Org teams with membership counts
    db.team.findMany({
      where: {
        project: {
          organizationId,
        },
      },
      select: {
        id: true,
        name: true,
        project: {
          select: {
            name: true,
            domain: true,
          },
        },
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    }),

    // Org users
    db.user.findMany({
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
      orderBy: { createdAt: "asc" },
    }),

    // Org time entries
    db.timeEntry.findMany({
      where: {
        task: {
          team: {
            project: {
              organizationId,
            },
          },
        },
      },
      select: {
        id: true,
        durationMinutes: true,
        userId: true,
        taskId: true,
      },
    }),
  ]);

  // Aggregate global task status metrics
  let todoCount = 0;
  let inProgressCount = 0;
  let doneCount = 0;
  let overdueCount = 0;
  let highPriorityOverdueCount = 0;
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;
  let totalEstimatedHours = 0;

  for (const t of tasks) {
    if (t.status === TaskStatus.TODO) todoCount++;
    else if (t.status === TaskStatus.IN_PROGRESS) inProgressCount++;
    else if (t.status === TaskStatus.DONE) doneCount++;

    if (t.priority === TaskPriority.HIGH) highPriorityCount++;
    else if (t.priority === TaskPriority.MEDIUM) mediumPriorityCount++;
    else if (t.priority === TaskPriority.LOW) lowPriorityCount++;

    if (t.estimatedHours) {
      totalEstimatedHours += t.estimatedHours;
    }

    if (t.dueDate && t.status !== TaskStatus.DONE && new Date(t.dueDate) < now) {
      overdueCount++;
      if (t.priority === TaskPriority.HIGH) {
        highPriorityOverdueCount++;
      }
    }
  }

  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const totalLoggedMinutes = timeEntries.reduce(
    (acc, entry) => acc + entry.durationMinutes,
    0
  );
  const totalLoggedHours = parseFloat((totalLoggedMinutes / 60).toFixed(1));

  // Build per-member workload calculations
  const membersWorkload: MemberWorkloadData[] = members.map((member) => {
    const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
    const activeTasks = memberTasks.filter((t) => t.status !== TaskStatus.DONE);
    const memberDoneTasks = memberTasks.filter((t) => t.status === TaskStatus.DONE);
    const memberTodoTasks = memberTasks.filter((t) => t.status === TaskStatus.TODO);
    const memberInProgressTasks = memberTasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS
    );

    const memberOverdue = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );
    const memberHighPriority = activeTasks.filter(
      (t) => t.priority === TaskPriority.HIGH
    );
    const memberMediumPriority = activeTasks.filter(
      (t) => t.priority === TaskPriority.MEDIUM
    );
    const memberLowPriority = activeTasks.filter(
      (t) => t.priority === TaskPriority.LOW
    );

    const memberEstimatedHours = activeTasks.reduce(
      (acc, t) => acc + (t.estimatedHours || 0),
      0
    );

    const memberLoggedMinutes = timeEntries
      .filter((e) => e.userId === member.id)
      .reduce((acc, e) => acc + e.durationMinutes, 0);
    const memberLoggedHours = parseFloat((memberLoggedMinutes / 60).toFixed(1));

    // Determine Workload Allocation:
    // Over-allocated: estimated hours > 30h OR >= 3 active high-priority tasks OR >= 7 active tasks
    // Under-allocated: <= 2 active tasks AND estimated hours < 10h
    // Balanced: in between
    let workloadStatus: WorkloadStatus = "BALANCED";
    let statusBadge = {
      label: "Balanced Load",
      color: "text-success",
      bg: "bg-success/15",
      border: "border-success/30",
    };

    if (
      memberEstimatedHours >= 30 ||
      memberHighPriority.length >= 3 ||
      activeTasks.length >= 7
    ) {
      workloadStatus = "OVER_ALLOCATED";
      statusBadge = {
        label: "Over-Allocated",
        color: "text-danger",
        bg: "bg-danger/15",
        border: "border-danger/30",
      };
    } else if (activeTasks.length <= 1 && memberEstimatedHours < 8) {
      workloadStatus = "UNDER_ALLOCATED";
      statusBadge = {
        label: "Under-Allocated",
        color: "text-muted",
        bg: "bg-muted/15",
        border: "border-border",
      };
    }

    const assignedActiveTasks = activeTasks.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      teamName: t.team.name,
    }));

    return {
      userId: member.id,
      name: member.name || member.email?.split("@")[0] || "Member",
      email: member.email || "",
      image: member.image,
      orgRole: member.orgRole,
      totalAssignedTasks: memberTasks.length,
      activeTasksCount: activeTasks.length,
      inProgressCount: memberInProgressTasks.length,
      todoCount: memberTodoTasks.length,
      doneCount: memberDoneTasks.length,
      overdueCount: memberOverdue.length,
      highPriorityCount: memberHighPriority.length,
      mediumPriorityCount: memberMediumPriority.length,
      lowPriorityCount: memberLowPriority.length,
      totalEstimatedHours: parseFloat(memberEstimatedHours.toFixed(1)),
      totalLoggedHours: memberLoggedHours,
      workloadStatus,
      statusBadge,
      assignedActiveTasks,
    };
  });

  // Sort members so over-allocated appear first, then balanced, then under-allocated
  membersWorkload.sort((a, b) => {
    const score = (m: MemberWorkloadData) =>
      m.workloadStatus === "OVER_ALLOCATED"
        ? 3
        : m.workloadStatus === "BALANCED"
          ? 2
          : 1;
    if (score(b) !== score(a)) {
      return score(b) - score(a);
    }
    return b.activeTasksCount - a.activeTasksCount;
  });

  // Build per-team workload metrics
  const teamsWorkload: TeamWorkloadData[] = teams.map((team) => {
    const teamTasks = tasks.filter((t) => t.teamId === team.id);
    const activeTasks = teamTasks.filter((t) => t.status !== TaskStatus.DONE);
    const doneTasks = teamTasks.filter((t) => t.status === TaskStatus.DONE);
    const teamOverdue = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );
    const teamEstimatedHours = teamTasks.reduce(
      (acc, t) => acc + (t.estimatedHours || 0),
      0
    );

    const teamTaskIds = new Set(teamTasks.map((t) => t.id));
    const teamLoggedMinutes = timeEntries
      .filter((e) => teamTaskIds.has(e.taskId))
      .reduce((acc, e) => acc + e.durationMinutes, 0);

    const membersCount = team._count.memberships || 1;
    const tasksPerMember = parseFloat(
      (activeTasks.length / membersCount).toFixed(1)
    );

    return {
      teamId: team.id,
      name: team.name,
      projectName: team.project.name,
      projectDomain: team.project.domain,
      membersCount: team._count.memberships,
      totalTasks: teamTasks.length,
      activeTasks: activeTasks.length,
      doneTasks: doneTasks.length,
      overdueTasks: teamOverdue.length,
      totalEstimatedHours: parseFloat(teamEstimatedHours.toFixed(1)),
      totalLoggedHours: parseFloat((teamLoggedMinutes / 60).toFixed(1)),
      tasksPerMember,
    };
  });

  return {
    taskStatus: {
      total: totalTasks,
      todo: todoCount,
      inProgress: inProgressCount,
      done: doneCount,
      completionRate,
    },
    priorityBreakdown: {
      high: highPriorityCount,
      medium: mediumPriorityCount,
      low: lowPriorityCount,
    },
    overdue: {
      total: overdueCount,
      highPriorityOverdue: highPriorityOverdueCount,
    },
    timeTracking: {
      totalEstimatedHours: parseFloat(totalEstimatedHours.toFixed(1)),
      totalLoggedHours,
      loggedMinutes: totalLoggedMinutes,
    },
    activeProjectsCount: projects.length,
    activeTeamsCount: teams.length,
    membersWorkload,
    teamsWorkload,
  };
}
