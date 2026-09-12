import { z } from "zod";

export const createSubtaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  title: z
    .string()
    .min(1, "Subtask title cannot be empty")
    .max(120, "Subtask title cannot exceed 120 characters"),
});

export const toggleSubtaskSchema = z.object({
  subtaskId: z.string().min(1, "Subtask ID is required"),
  isCompleted: z.boolean(),
});

export const deleteSubtaskSchema = z.object({
  subtaskId: z.string().min(1, "Subtask ID is required"),
});

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type ToggleSubtaskInput = z.infer<typeof toggleSubtaskSchema>;
export type DeleteSubtaskInput = z.infer<typeof deleteSubtaskSchema>;
