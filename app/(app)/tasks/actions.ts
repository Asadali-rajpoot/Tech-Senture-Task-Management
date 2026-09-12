"use server";

import { revalidatePath } from "next/cache";
import { withOrgScope } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { OrgRole, TeamRole, TaskStatus, NotificationType } from "@prisma/client";
import { sendSystemNotification } from "@/lib/notifications/dispatcher";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskPositionAndStatusSchema,
  updateTaskAssigneeSchema,
  deleteTaskSchema,
} from "@/lib/validation/task";
import {
  createSubtaskSchema,
  toggleSubtaskSchema,
  deleteSubtaskSchema,
} from "@/lib/validation/subtask";
import {
  createLabelSchema,
  deleteLabelSchema,
  toggleTaskLabelSchema,
} from "@/lib/validation/label";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "@/lib/validation/comment";
import {
  uploadAttachmentSchema,
  deleteAttachmentSchema,
} from "@/lib/validation/attachment";
import {
  addDependencySchema,
  removeDependencySchema,
} from "@/lib/validation/dependency";
import {
  createTimeEntrySchema,
  deleteTimeEntrySchema,
} from "@/lib/validation/time-entry";
import { getStorageProvider } from "@/lib/storage";
import { generateNextRecurringTaskInstance } from "@/lib/tasks/recurrence";
import { recordTaskActivity } from "@/lib/tasks/activity";

export type TaskActionResponse = {
  error?: string;
  success?: string;
  warning?: string;
  taskId?: string;
  subtaskId?: string;
  labelId?: string;
  commentId?: string;
  attachmentId?: string;
  dependencyId?: string;
};

/**
 * Creates a new task within a team.
 */
export async function createTaskAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());

  if (rawData.assigneeId === "" || rawData.assigneeId === "UNASSIGNED") {
    rawData.assigneeId = null as unknown as string;
  }
  if (rawData.startDate === "") {
    rawData.startDate = null as unknown as string;
  }
  if (rawData.dueDate === "") {
    rawData.dueDate = null as unknown as string;
  }

  const parsed = createTaskSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid task details",
    };
  }

  const {
    title,
    description,
    teamId,
    assigneeId,
    priority,
    status,
    recurrence,
    startDate,
    dueDate,
    estimatedHours,
  } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
      });

      if (!team) {
        return { error: "Selected team was not found in this workspace." };
      }

      if (assigneeId) {
        const assignee = await db.user.findFirst({
          where: { id: assigneeId, organizationId },
        });
        if (!assignee) {
          return { error: "Assignee is not a member of this workspace." };
        }
      }

      const lastTask = await db.task.findFirst({
        where: { teamId, status },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const nextPosition = lastTask ? lastTask.position + 1000 : 1000;

      const task = await db.task.create({
        data: {
          title,
          description: description || null,
          priority,
          status,
          recurrence,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours !== undefined ? estimatedHours : null,
          position: nextPosition,
          teamId,
          assigneeId: assigneeId || null,
          creatorId: user.id,
        },
      });

      // Record activity log (PRD §6.5.11)
      await recordTaskActivity({
        taskId: task.id,
        actorId: user.id,
        action: "TASK_CREATED",
        newValue: task.title,
      });

      // Dispatch assignment notification if assigned to another user (PRD §6.6.2)
      if (assigneeId && assigneeId !== user.id) {
        await sendSystemNotification({
          userId: assigneeId,
          type: NotificationType.ASSIGNMENT,
          title: "New task assigned to you",
          message: `${user.name || user.email} assigned you to task "${task.title}".`,
          link: "/tasks/list",
        });
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/projects");
      revalidatePath(`/teams/${teamId}`);
      revalidatePath("/dashboard");

      return {
        success: `Task "${task.title}" created successfully!`,
        taskId: task.id,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

/**
 * Updates an existing task.
 */
export async function updateTaskAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());

  if (rawData.assigneeId === "" || rawData.assigneeId === "UNASSIGNED") {
    rawData.assigneeId = null as unknown as string;
  }
  if (rawData.startDate === "") {
    rawData.startDate = null as unknown as string;
  }
  if (rawData.dueDate === "") {
    rawData.dueDate = null as unknown as string;
  }

  const parsed = updateTaskSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid task updates",
    };
  }

  const {
    taskId,
    title,
    description,
    teamId,
    assigneeId,
    priority,
    status,
    recurrence,
    startDate,
    dueDate,
    estimatedHours,
  } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      if (teamId && teamId !== task.teamId) {
        const targetTeam = await db.team.findFirst({
          where: { id: teamId, project: { organizationId } },
        });
        if (!targetTeam) {
          return { error: "Target team not found in this workspace." };
        }
      }

      if (assigneeId) {
        const assignee = await db.user.findFirst({
          where: { id: assigneeId, organizationId },
        });
        if (!assignee) {
          return { error: "Assignee is not a member of this workspace." };
        }
      }

      await db.task.update({
        where: { id: taskId },
        data: {
          title,
          description: description || null,
          teamId: teamId || undefined,
          assigneeId: assigneeId || null,
          priority,
          status,
          recurrence,
          startDate: startDate ? new Date(startDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours !== undefined ? estimatedHours : undefined,
        },
      });

      // Record activity logs for changed fields (PRD §6.5.11)
      if (title !== task.title) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "TITLE_CHANGED",
          field: "title",
          oldValue: task.title,
          newValue: title,
        });
      }
      if (status !== task.status) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: task.status,
          newValue: status,
        });
      }
      if (priority !== task.priority) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "PRIORITY_CHANGED",
          field: "priority",
          oldValue: task.priority,
          newValue: priority,
        });
      }
      if (assigneeId !== task.assigneeId) {
        const oldAssignee = task.assigneeId
          ? await db.user.findUnique({ where: { id: task.assigneeId }, select: { name: true, email: true } })
          : null;
        const newAssignee = assigneeId
          ? await db.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } })
          : null;
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "ASSIGNEE_CHANGED",
          field: "assignee",
          oldValue: oldAssignee?.name || oldAssignee?.email || "Unassigned",
          newValue: newAssignee?.name || newAssignee?.email || "Unassigned",
        });

        if (assigneeId && assigneeId !== user.id) {
          await sendSystemNotification({
            userId: assigneeId,
            type: NotificationType.ASSIGNMENT,
            title: "Task assigned to you",
            message: `${user.name || user.email} assigned you to task "${title}".`,
            link: "/tasks/list",
          });
        }
      }
      if (estimatedHours !== undefined && estimatedHours !== task.estimatedHours) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "ESTIMATE_CHANGED",
          field: "estimate",
          oldValue: task.estimatedHours != null ? `${task.estimatedHours}h` : "No estimate",
          newValue: estimatedHours != null ? `${estimatedHours}h` : "No estimate",
        });
      }

      // On completing a recurring task, automatically generate next instance (PRD §6.5.9)
      if (status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        await generateNextRecurringTaskInstance(taskId, user.id);
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath(`/teams/${task.teamId}`);
      revalidatePath("/dashboard");

      return { success: `Task "${title}" updated successfully.` };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

/**
 * Updates status of a task directly.
 */
export async function updateTaskStatusAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateTaskStatusSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid status update" };
  }

  const { taskId, status } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
        include: {
          dependencies: {
            include: {
              dependsOnTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      await db.task.update({
        where: { id: taskId },
        data: { status },
      });

      // Record activity log (PRD §6.5.11)
      if (status !== task.status) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: task.status,
          newValue: status,
        });
      }

      // On completing a recurring task, automatically generate next instance (PRD §6.5.9)
      if (status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        await generateNextRecurringTaskInstance(taskId, user.id);
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/dashboard");

      let warning: string | undefined;
      if (status === TaskStatus.DONE) {
        const incompleteDeps = task.dependencies.filter(
          (d) => d.dependsOnTask.status !== TaskStatus.DONE
        );
        if (incompleteDeps.length > 0) {
          warning = `Task marked Done, but ${incompleteDeps.length} prerequisite task${incompleteDeps.length > 1 ? "s are" : " is"} still incomplete (${incompleteDeps.map((d) => `"${d.dependsOnTask.title}"`).join(", ")}).`;
        }
      }

      return {
        success: "Task status updated.",
        warning,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Updates both position and status (for Kanban drag-and-drop).
 */
export async function updateTaskPositionAndStatusAction(
  taskId: string,
  status: TaskStatus,
  position: number
): Promise<TaskActionResponse> {
  const parsed = updateTaskPositionAndStatusSchema.safeParse({
    taskId,
    status,
    position,
  });

  if (!parsed.success) {
    return { error: "Invalid position/status update" };
  }

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
        include: {
          dependencies: {
            include: {
              dependsOnTask: {
                select: { id: true, title: true, status: true },
              },
            },
          },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      await db.task.update({
        where: { id: taskId },
        data: {
          status,
          position,
        },
      });

      // Record activity log (PRD §6.5.11)
      if (status !== task.status) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: task.status,
          newValue: status,
        });
      }

      // On completing a recurring task, automatically generate next instance (PRD §6.5.9)
      if (status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        await generateNextRecurringTaskInstance(taskId, user.id);
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/dashboard");

      let warning: string | undefined;
      if (status === TaskStatus.DONE) {
        const incompleteDeps = task.dependencies.filter(
          (d) => d.dependsOnTask.status !== TaskStatus.DONE
        );
        if (incompleteDeps.length > 0) {
          warning = `Task marked Done, but ${incompleteDeps.length} prerequisite task${incompleteDeps.length > 1 ? "s are" : " is"} still incomplete.`;
        }
      }

      return {
        success: "Task moved successfully.",
        warning,
      };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update task position and status",
    };
  }
}

/**
 * Updates assignee of a task directly.
 */
export async function updateTaskAssigneeAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());

  if (rawData.assigneeId === "" || rawData.assigneeId === "UNASSIGNED") {
    rawData.assigneeId = null as unknown as string;
  }

  const parsed = updateTaskAssigneeSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid assignee selection" };
  }

  const { taskId, assigneeId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      let newAssignee = null;
      if (assigneeId) {
        newAssignee = await db.user.findFirst({
          where: { id: assigneeId, organizationId },
          select: { name: true, email: true },
        });
        if (!newAssignee) {
          return { error: "Selected user not found in workspace." };
        }
      }

      const oldAssignee = task.assigneeId
        ? await db.user.findUnique({ where: { id: task.assigneeId }, select: { name: true, email: true } })
        : null;

      await db.task.update({
        where: { id: taskId },
        data: {
          assigneeId: assigneeId || null,
        },
      });

      // Record activity log (PRD §6.5.11)
      if (assigneeId !== task.assigneeId) {
        await recordTaskActivity({
          taskId,
          actorId: user.id,
          action: "ASSIGNEE_CHANGED",
          field: "assignee",
          oldValue: oldAssignee?.name || oldAssignee?.email || "Unassigned",
          newValue: newAssignee?.name || newAssignee?.email || "Unassigned",
        });

        if (assigneeId && assigneeId !== user.id) {
          await sendSystemNotification({
            userId: assigneeId,
            type: NotificationType.ASSIGNMENT,
            title: "Task assigned to you",
            message: `${user.name || user.email} assigned you to task "${task.title}".`,
            link: "/tasks/list",
          });
        }
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/dashboard");

      return {
        success: newAssignee
          ? `Task assigned to ${newAssignee.name || newAssignee.email}.`
          : "Task unassigned.",
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to assign task",
    };
  }
}

/**
 * Deletes a task.
 */
export async function deleteTaskAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteTaskSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid task delete request" };
  }

  const { taskId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
        include: {
          team: {
            include: {
              memberships: {
                where: { userId: user.id },
              },
            },
          },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      const isCreator = task.creatorId === user.id;
      const isAssignee = task.assigneeId === user.id;
      const isTeamOwner = task.team.memberships[0]?.role === TeamRole.OWNER;
      const isOrgAdminOrOwner =
        user.orgRole === OrgRole.ORG_OWNER ||
        user.orgRole === OrgRole.ORG_ADMIN;

      if (!isCreator && !isAssignee && !isTeamOwner && !isOrgAdminOrOwner) {
        return {
          error:
            "Permission denied. Only task creators, assignees, team owners, or workspace admins can delete tasks.",
        };
      }

      await db.task.delete({
        where: { id: taskId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath(`/teams/${task.teamId}`);
      revalidatePath("/dashboard");

      return { success: `Task "${task.title}" deleted.` };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

// ===========================================================================
// SUBTASK SERVER ACTIONS (PRD.md §6.5.4)
// ===========================================================================

export async function createSubtaskAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createSubtaskSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid subtask title",
    };
  }

  const { taskId, title } = parsed.data;

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      const subtask = await db.subtask.create({
        data: {
          title,
          taskId,
          isCompleted: false,
        },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success: "Subtask added.",
        subtaskId: subtask.id,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add subtask",
    };
  }
}

export async function toggleSubtaskAction(
  subtaskId: string,
  isCompleted: boolean
): Promise<TaskActionResponse> {
  const parsed = toggleSubtaskSchema.safeParse({ subtaskId, isCompleted });
  if (!parsed.success) {
    return { error: "Invalid toggle request" };
  }

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const subtask = await db.subtask.findFirst({
        where: {
          id: subtaskId,
          task: { team: { project: { organizationId } } },
        },
      });

      if (!subtask) {
        return { error: "Subtask not found in this workspace." };
      }

      await db.subtask.update({
        where: { id: subtaskId },
        data: { isCompleted },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Subtask updated." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to update subtask",
    };
  }
}

export async function deleteSubtaskAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteSubtaskSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid subtask delete request" };
  }

  const { subtaskId } = parsed.data;

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const subtask = await db.subtask.findFirst({
        where: {
          id: subtaskId,
          task: { team: { project: { organizationId } } },
        },
      });

      if (!subtask) {
        return { error: "Subtask not found in this workspace." };
      }

      await db.subtask.delete({
        where: { id: subtaskId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Subtask deleted." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete subtask",
    };
  }
}

// ===========================================================================
// LABEL & TAG SERVER ACTIONS (PRD.md §6.5.5)
// ===========================================================================

export async function createLabelAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = createLabelSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid label details",
    };
  }

  const { teamId, name, color } = parsed.data;

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const team = await db.team.findFirst({
        where: {
          id: teamId,
          project: { organizationId },
        },
      });

      if (!team) {
        return { error: "Team not found in this workspace." };
      }

      const existingLabel = await db.label.findFirst({
        where: {
          teamId,
          name: { equals: name, mode: "insensitive" },
        },
      });

      if (existingLabel) {
        return { error: `A label named "${name}" already exists for this team.` };
      }

      const label = await db.label.create({
        data: {
          name,
          color,
          teamId,
        },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath(`/teams/${teamId}`);

      return {
        success: `Label "${label.name}" created!`,
        labelId: label.id,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create label",
    };
  }
}

export async function deleteLabelAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteLabelSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid label delete request" };
  }

  const { labelId } = parsed.data;

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const label = await db.label.findFirst({
        where: {
          id: labelId,
          team: { project: { organizationId } },
        },
      });

      if (!label) {
        return { error: "Label not found in this workspace." };
      }

      await db.label.delete({
        where: { id: labelId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath(`/teams/${label.teamId}`);

      return { success: `Label "${label.name}" deleted.` };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete label",
    };
  }
}

export async function toggleTaskLabelAction(
  taskId: string,
  labelId: string,
  action: "attach" | "detach"
): Promise<TaskActionResponse> {
  const parsed = toggleTaskLabelSchema.safeParse({ taskId, labelId, action });
  if (!parsed.success) {
    return { error: "Invalid label toggle request" };
  }

  try {
    return await withOrgScope(async ({ organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
        include: {
          labels: true,
        },
      });

      if (!task) {
        return { error: "Task not found." };
      }

      const label = await db.label.findFirst({
        where: {
          id: labelId,
          teamId: task.teamId,
        },
      });

      if (!label) {
        return { error: "Label not found for this team." };
      }

      if (action === "attach") {
        await db.task.update({
          where: { id: taskId },
          data: {
            labels: {
              connect: { id: labelId },
            },
          },
        });
      } else {
        await db.task.update({
          where: { id: taskId },
          data: {
            labels: {
              disconnect: { id: labelId },
            },
          },
        });
      }

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success:
          action === "attach"
            ? `Attached label "${label.name}"`
            : `Removed label "${label.name}"`,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to toggle label",
    };
  }
}

// ===========================================================================
// COMMENT & MENTION SERVER ACTIONS (PRD.md §6.5.6, §6.6.1)
// ===========================================================================

export async function createCommentAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());

  let mentionedUserIds: string[] = [];
  if (typeof rawData.mentionedUserIds === "string" && rawData.mentionedUserIds) {
    try {
      mentionedUserIds = JSON.parse(rawData.mentionedUserIds);
    } catch {
      mentionedUserIds = rawData.mentionedUserIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const parsed = createCommentSchema.safeParse({
    taskId: rawData.taskId,
    content: rawData.content,
    mentionedUserIds,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid comment content",
    };
  }

  const { taskId, content, mentionedUserIds: parsedMentions } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
        include: {
          team: {
            include: {
              memberships: true,
            },
          },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      // Create comment
      const comment = await db.comment.create({
        data: {
          content,
          taskId,
          authorId: user.id,
        },
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
      });

      // Extract @mentions against team members
      const teamMemberUserIds = new Set(
        task.team.memberships.map((m) => m.userId)
      );
      const targetUserIds = new Set<string>();

      parsedMentions?.forEach((id) => {
        if (teamMemberUserIds.has(id) && id !== user.id) {
          targetUserIds.add(id);
        }
      });

      // Create notification records for mentioned users (PRD.md §6.6.1 / §6.6.2)
      for (const targetUserId of targetUserIds) {
        await sendSystemNotification({
          userId: targetUserId,
          type: NotificationType.MENTION,
          title: "You were mentioned in a comment",
          message: `${user.name || user.email} mentioned you on task "${task.title}": "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
          link: "/tasks/list",
        });
      }

      // Also notify task assignee if not the commenter and not already mentioned (PRD §6.6.2)
      if (
        task.assigneeId &&
        task.assigneeId !== user.id &&
        !targetUserIds.has(task.assigneeId)
      ) {
        await sendSystemNotification({
          userId: task.assigneeId,
          type: NotificationType.COMMENT,
          title: "New comment on your task",
          message: `${user.name || user.email} commented on task "${task.title}": "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`,
          link: "/tasks/list",
        });
      }

      // Record activity log (PRD §6.5.11)
      await recordTaskActivity({
        taskId,
        actorId: user.id,
        action: "COMMENT_ADDED",
        field: "comment",
        newValue: content.slice(0, 80),
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success: "Comment posted.",
        commentId: comment.id,
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to post comment",
    };
  }
}

export async function updateCommentAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = updateCommentSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid comment update",
    };
  }

  const { commentId, content } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const comment = await db.comment.findFirst({
        where: {
          id: commentId,
          task: { team: { project: { organizationId } } },
        },
      });

      if (!comment) {
        return { error: "Comment not found." };
      }

      if (comment.authorId !== user.id) {
        return { error: "You can only edit your own comments." };
      }

      await db.comment.update({
        where: { id: commentId },
        data: { content },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Comment updated." };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update comment",
    };
  }
}

export async function deleteCommentAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteCommentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid comment delete request" };
  }

  const { commentId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const comment = await db.comment.findFirst({
        where: {
          id: commentId,
          task: { team: { project: { organizationId } } },
        },
        include: {
          task: {
            include: {
              team: {
                include: {
                  memberships: {
                    where: { userId: user.id },
                  },
                },
              },
            },
          },
        },
      });

      if (!comment) {
        return { error: "Comment not found." };
      }

      const isAuthor = comment.authorId === user.id;
      const isTeamOwner =
        comment.task.team.memberships[0]?.role === TeamRole.OWNER;
      const isOrgAdminOrOwner =
        user.orgRole === OrgRole.ORG_OWNER ||
        user.orgRole === OrgRole.ORG_ADMIN;

      if (!isAuthor && !isTeamOwner && !isOrgAdminOrOwner) {
        return {
          error:
            "Permission denied. Only comment authors or admins can delete comments.",
        };
      }

      await db.comment.delete({
        where: { id: commentId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Comment deleted." };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
}

// ===========================================================================
// FILE ATTACHMENT SERVER ACTIONS (PRD.md §6.5.7)
// ===========================================================================

export async function uploadAttachmentAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const taskId = formData.get("taskId") as string;
  const file = formData.get("file") as File | null;

  if (!taskId) {
    return { error: "Task ID is required." };
  }

  if (!file || file.size === 0) {
    return { error: "Please select a valid file to upload." };
  }

  const parsed = uploadAttachmentSchema.safeParse({ taskId });
  if (!parsed.success) {
    return { error: "Invalid upload request." };
  }

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      const storage = getStorageProvider();
      const uploadResult = await storage.upload(file);

      const attachment = await db.attachment.create({
        data: {
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.fileUrl,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          taskId,
          uploaderId: user.id,
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Record activity log (PRD §6.5.11)
      await recordTaskActivity({
        taskId,
        actorId: user.id,
        action: "ATTACHMENT_ADDED",
        field: "attachment",
        newValue: attachment.fileName,
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success: `File "${attachment.fileName}" uploaded successfully.`,
        attachmentId: attachment.id,
      };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to upload attachment",
    };
  }
}

export async function deleteAttachmentAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = deleteAttachmentSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: "Invalid delete attachment request." };
  }

  const { attachmentId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const attachment = await db.attachment.findFirst({
        where: {
          id: attachmentId,
          task: { team: { project: { organizationId } } },
        },
        include: {
          task: {
            include: {
              team: {
                include: {
                  memberships: {
                    where: { userId: user.id },
                  },
                },
              },
            },
          },
        },
      });

      if (!attachment) {
        return { error: "Attachment not found." };
      }

      const isUploader = attachment.uploaderId === user.id;
      const isTeamOwner =
        attachment.task.team.memberships[0]?.role === TeamRole.OWNER;
      const isOrgAdminOrOwner =
        user.orgRole === OrgRole.ORG_OWNER ||
        user.orgRole === OrgRole.ORG_ADMIN;

      if (!isUploader && !isTeamOwner && !isOrgAdminOrOwner) {
        return {
          error:
            "Permission denied. Only file uploaders or admins can delete attachments.",
        };
      }

      const storage = getStorageProvider();
      await storage.delete(attachment.fileUrl);

      await db.attachment.delete({
        where: { id: attachmentId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: `Attachment "${attachment.fileName}" removed.` };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete attachment",
    };
  }
}

/**
 * Helper to detect circular dependency before creating a new link.
 * Returns true if startTaskId depends on targetTaskId (directly or transitively).
 */
async function checkHasCycle(
  startTaskId: string,
  targetTaskId: string
): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [startTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetTaskId) {
      return true;
    }
    if (!visited.has(current)) {
      visited.add(current);
      const deps = await db.taskDependency.findMany({
        where: { dependentTaskId: current },
        select: { dependsOnTaskId: true },
      });
      for (const dep of deps) {
        if (!visited.has(dep.dependsOnTaskId)) {
          queue.push(dep.dependsOnTaskId);
        }
      }
    }
  }

  return false;
}

/**
 * Adds a dependency between two tasks (Task A depends on Task B).
 */
export async function addDependencyAction(
  input: { taskId: string; dependsOnTaskId: string } | FormData
): Promise<TaskActionResponse> {
  let rawData: Record<string, unknown>;
  if (input instanceof FormData) {
    rawData = Object.fromEntries(input.entries());
  } else {
    rawData = input;
  }

  const parsed = addDependencySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid dependency details.",
    };
  }

  const { taskId, dependsOnTaskId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      // Ensure both tasks belong to the organization
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Target task not found in this workspace." };
      }

      const dependsOnTask = await db.task.findFirst({
        where: {
          id: dependsOnTaskId,
          team: { project: { organizationId } },
        },
      });

      if (!dependsOnTask) {
        return { error: "Prerequisite task not found in this workspace." };
      }

      // Check if dependency already exists
      const existing = await db.taskDependency.findUnique({
        where: {
          dependentTaskId_dependsOnTaskId: {
            dependentTaskId: taskId,
            dependsOnTaskId,
          },
        },
      });

      if (existing) {
        return { error: "This dependency already exists." };
      }

      // Check for circular dependency: if dependsOnTaskId already depends on taskId
      const createsCycle = await checkHasCycle(dependsOnTaskId, taskId);
      if (createsCycle) {
        return {
          error:
            "Circular dependency detected: completing this link would create a loop.",
        };
      }

      const dependency = await db.taskDependency.create({
        data: {
          dependentTaskId: taskId,
          dependsOnTaskId,
        },
      });

      // Record activity log (PRD §6.5.11)
      await recordTaskActivity({
        taskId,
        actorId: user.id,
        action: "DEPENDENCY_ADDED",
        field: "dependency",
        newValue: dependsOnTask.title,
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success: `Dependency added: "${task.title}" now depends on "${dependsOnTask.title}".`,
        dependencyId: dependency.id,
      };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to add dependency",
    };
  }
}

/**
 * Removes a dependency between two tasks.
 */
export async function removeDependencyAction(
  input: { taskId: string; dependsOnTaskId: string } | FormData
): Promise<TaskActionResponse> {
  let rawData: Record<string, unknown>;
  if (input instanceof FormData) {
    rawData = Object.fromEntries(input.entries());
  } else {
    rawData = input;
  }

  const parsed = removeDependencySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message || "Invalid dependency removal request.",
    };
  }

  const { taskId, dependsOnTaskId } = parsed.data;

  try {
    return await withOrgScope(async ({ organizationId }) => {
      // Ensure task belongs to org
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      const existing = await db.taskDependency.findUnique({
        where: {
          dependentTaskId_dependsOnTaskId: {
            dependentTaskId: taskId,
            dependsOnTaskId,
          },
        },
      });

      if (!existing) {
        return { error: "Dependency not found." };
      }

      await db.taskDependency.delete({
        where: {
          dependentTaskId_dependsOnTaskId: {
            dependentTaskId: taskId,
            dependsOnTaskId,
          },
        },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Dependency removed." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove dependency",
    };
  }
}

/**
 * Creates a time entry log against a task (PRD §6.5.10).
 */
export async function createTimeEntryAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse & { timeEntryId?: string }> {
  const rawData = Object.fromEntries(formData.entries());

  const parsed = createTimeEntrySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid time entry.",
    };
  }

  const { taskId, durationMinutes, note, loggedAt } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          team: { project: { organizationId } },
        },
      });

      if (!task) {
        return { error: "Task not found in this workspace." };
      }

      const timeEntry = await db.timeEntry.create({
        data: {
          taskId,
          userId: user.id,
          durationMinutes,
          note: note || null,
          loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        },
      });

      // Record activity log (PRD §6.5.11)
      const durationHours = (durationMinutes / 60).toFixed(1).replace(/\.0$/, "");
      await recordTaskActivity({
        taskId,
        actorId: user.id,
        action: "TIME_LOGGED",
        field: "time",
        newValue: `${durationHours}h`,
        metadata: note || null,
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return {
        success: "Time logged successfully!",
        timeEntryId: timeEntry.id,
      };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to log time entry",
    };
  }
}

/**
 * Deletes a time entry log.
 */
export async function deleteTimeEntryAction(
  _prevState: TaskActionResponse,
  formData: FormData
): Promise<TaskActionResponse> {
  const rawData = Object.fromEntries(formData.entries());

  const parsed = deleteTimeEntrySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid request.",
    };
  }

  const { timeEntryId } = parsed.data;

  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const timeEntry = await db.timeEntry.findFirst({
        where: {
          id: timeEntryId,
          task: { team: { project: { organizationId } } },
        },
      });

      if (!timeEntry) {
        return { error: "Time entry not found." };
      }

      // Allow author or ORG_OWNER / ORG_ADMIN to delete
      const userMembership = await db.user.findUnique({
        where: { id: user.id },
        select: { orgRole: true },
      });

      const isAuthor = timeEntry.userId === user.id;
      const isAdmin =
        userMembership?.orgRole === "ORG_OWNER" ||
        userMembership?.orgRole === "ORG_ADMIN";

      if (!isAuthor && !isAdmin) {
        return {
          error: "You are not authorized to delete this time entry.",
        };
      }

      await db.timeEntry.delete({
        where: { id: timeEntryId },
      });

      revalidatePath("/tasks");
      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");

      return { success: "Time entry deleted." };
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete time entry",
    };
  }
}
