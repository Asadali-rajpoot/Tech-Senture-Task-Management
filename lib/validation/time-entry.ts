import { z } from "zod";

export const createTimeEntrySchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  durationMinutes: z
    .coerce
    .number()
    .int("Duration must be a whole number of minutes")
    .min(1, "Logged time must be at least 1 minute")
    .max(1440, "Single time entry cannot exceed 24 hours (1440 minutes)"),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .optional()
    .nullable(),
  loggedAt: z.string().optional().nullable(),
});

export const deleteTimeEntrySchema = z.object({
  timeEntryId: z.string().min(1, "Time entry ID is required"),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type DeleteTimeEntryInput = z.infer<typeof deleteTimeEntrySchema>;
