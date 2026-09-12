import { z } from "zod";

export const createCommentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(5000, "Comment is too long (max 5000 characters)"),
  mentionedUserIds: z.array(z.string()).optional().default([]),
});

export const updateCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(5000, "Comment is too long (max 5000 characters)"),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
