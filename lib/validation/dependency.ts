import { z } from "zod";

export const addDependencySchema = z
  .object({
    taskId: z.string().min(1, "Task ID is required"),
    dependsOnTaskId: z.string().min(1, "Prerequisite Task ID is required"),
  })
  .refine((data) => data.taskId !== data.dependsOnTaskId, {
    message: "A task cannot depend on itself",
    path: ["dependsOnTaskId"],
  });

export const removeDependencySchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  dependsOnTaskId: z.string().min(1, "Prerequisite Task ID is required"),
});

export type AddDependencyInput = z.infer<typeof addDependencySchema>;
export type RemoveDependencyInput = z.infer<typeof removeDependencySchema>;
