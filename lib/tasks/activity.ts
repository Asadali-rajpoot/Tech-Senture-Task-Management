import { db } from "@/lib/db";

export type ActivityActionType =
  | "TASK_CREATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "TITLE_CHANGED"
  | "DESCRIPTION_CHANGED"
  | "DUE_DATE_CHANGED"
  | "ESTIMATE_CHANGED"
  | "RECURRENCE_CHANGED"
  | "COMMENT_ADDED"
  | "ATTACHMENT_ADDED"
  | "DEPENDENCY_ADDED"
  | "TIME_LOGGED";

export interface RecordActivityOptions {
  taskId: string;
  actorId?: string | null;
  action: ActivityActionType | string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: string | null;
}

/**
 * Records an immutable activity log entry for a task (PRD §6.5.11).
 */
export async function recordTaskActivity(
  options: RecordActivityOptions,
  client?: typeof db
) {
  const prisma = client || db;
  try {
    return await prisma.taskActivity.create({
      data: {
        taskId: options.taskId,
        actorId: options.actorId || null,
        action: options.action,
        field: options.field || null,
        oldValue: options.oldValue || null,
        newValue: options.newValue || null,
        metadata: options.metadata || null,
      },
    });
  } catch (err) {
    // Non-blocking error handling for activity logs
    console.error("Failed to record task activity:", err);
    return null;
  }
}
