import { z } from "zod";

export const createLabelSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  name: z
    .string()
    .min(1, "Label name cannot be empty")
    .max(40, "Label name cannot exceed 40 characters"),
  color: z
    .string()
    .min(3, "Valid color is required")
    .max(20, "Color cannot exceed 20 characters")
    .default("#6366F1"),
});

export const deleteLabelSchema = z.object({
  labelId: z.string().min(1, "Label ID is required"),
});

export const toggleTaskLabelSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  labelId: z.string().min(1, "Label ID is required"),
  action: z.enum(["attach", "detach"]),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type DeleteLabelInput = z.infer<typeof deleteLabelSchema>;
export type ToggleTaskLabelInput = z.infer<typeof toggleTaskLabelSchema>;
