import { z } from "zod";
import { TaskPriority, TaskStatus, RecurrenceRule } from "@prisma/client";

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(2, "Task title must be at least 2 characters")
    .max(120, "Task title cannot exceed 120 characters"),
  description: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().max(2000, "Description cannot exceed 2000 characters").nullable().optional()
    ),
  teamId: z.string().min(1, "Please select a team"),
  assigneeId: z
    .preprocess(
      (val) => (val === "" || val === "UNASSIGNED" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  recurrence: z.nativeEnum(RecurrenceRule).default(RecurrenceRule.NONE),
  startDate: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  dueDate: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  estimatedHours: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number()
        .min(0, "Estimated hours must be positive")
        .max(10000, "Estimated hours cannot exceed 10,000")
        .nullable()
        .optional()
    ),
});

export const updateTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  title: z
    .string()
    .min(2, "Task title must be at least 2 characters")
    .max(120, "Task title cannot exceed 120 characters"),
  description: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().max(2000, "Description cannot exceed 2000 characters").nullable().optional()
    ),
  teamId: z.string().min(1, "Team ID is required").optional(),
  assigneeId: z
    .preprocess(
      (val) => (val === "" || val === "UNASSIGNED" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  priority: z.nativeEnum(TaskPriority),
  status: z.nativeEnum(TaskStatus),
  recurrence: z.nativeEnum(RecurrenceRule).default(RecurrenceRule.NONE),
  startDate: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  dueDate: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : String(val)),
      z.string().nullable().optional()
    ),
  estimatedHours: z
    .preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number()
        .min(0, "Estimated hours must be positive")
        .max(10000, "Estimated hours cannot exceed 10,000")
        .nullable()
        .optional()
    ),
});

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  status: z.nativeEnum(TaskStatus),
});

export const updateTaskPositionAndStatusSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  status: z.nativeEnum(TaskStatus),
  position: z.number(),
});

export const updateTaskAssigneeSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  assigneeId: z.string().optional().nullable(),
});

export const deleteTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type UpdateTaskPositionAndStatusInput = z.infer<typeof updateTaskPositionAndStatusSchema>;
export type UpdateTaskAssigneeInput = z.infer<typeof updateTaskAssigneeSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
