import { db } from "@/lib/db";
import { RecurrenceRule, TaskStatus } from "@prisma/client";

/**
 * Calculates the next due date based on the recurrence rule.
 */
export function calculateNextDueDate(
  currentDueDate: Date | string | null,
  recurrence: RecurrenceRule
): Date {
  const base = currentDueDate ? new Date(currentDueDate) : new Date();
  const next = new Date(base);
  const now = new Date();

  switch (recurrence) {
    case RecurrenceRule.DAILY:
      next.setDate(next.getDate() + 1);
      // If calculated date is still in the past, bump to tomorrow
      if (next < now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      }
      return next;

    case RecurrenceRule.WEEKLY:
      next.setDate(next.getDate() + 7);
      if (next < now) {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      }
      return next;

    case RecurrenceRule.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      if (next < now) {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      }
      return next;

    case RecurrenceRule.NONE:
    default:
      return next;
  }
}

/**
 * Generates the next instance of a recurring task when an instance is marked DONE.
 * Preserves the completed task in history and creates the subsequent active task.
 */
export async function generateNextRecurringTaskInstance(
  completedTaskId: string,
  userId: string
) {
  const task = await db.task.findUnique({
    where: { id: completedTaskId },
    include: {
      labels: true,
      subtasks: true,
    },
  });

  if (!task || task.recurrence === RecurrenceRule.NONE) {
    return null;
  }

  // Check if an active instance already exists for this recurring series
  const parentSeriesId = task.parentId || task.id;
  const existingActive = await db.task.findFirst({
    where: {
      OR: [
        { id: parentSeriesId, status: { not: TaskStatus.DONE } },
        { parentId: parentSeriesId, status: { not: TaskStatus.DONE } },
      ],
      id: { not: completedTaskId },
    },
  });

  if (existingActive) {
    return existingActive;
  }

  const nextDueDate = calculateNextDueDate(task.dueDate, task.recurrence);

  // Find last position in TODO column for team
  const lastTask = await db.task.findFirst({
    where: { teamId: task.teamId, status: TaskStatus.TODO },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const newPosition = lastTask ? lastTask.position + 1000 : 1000;

  const nextTask = await db.task.create({
    data: {
      title: task.title,
      description: task.description,
      status: TaskStatus.TODO,
      priority: task.priority,
      teamId: task.teamId,
      assigneeId: task.assigneeId,
      creatorId: userId,
      recurrence: task.recurrence,
      parentId: parentSeriesId,
      dueDate: nextDueDate,
      position: newPosition,
      labels: {
        connect: task.labels.map((l) => ({ id: l.id })),
      },
      subtasks: {
        create: task.subtasks.map((s) => ({
          title: s.title,
          isCompleted: false,
        })),
      },
    },
    include: {
      labels: true,
      subtasks: true,
    },
  });

  return nextTask;
}
