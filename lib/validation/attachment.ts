import { z } from "zod";

export const uploadAttachmentSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
});

export const deleteAttachmentSchema = z.object({
  attachmentId: z.string().min(1, "Attachment ID is required"),
});

export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
export type DeleteAttachmentInput = z.infer<typeof deleteAttachmentSchema>;
