import { z } from "zod";
import { TeamRole } from "@prisma/client";

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(60, "Team name cannot exceed 60 characters"),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .optional()
    .nullable(),
  projectId: z.string().min(1, "Please select a parent project"),
});

export const updateTeamSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(60, "Team name cannot exceed 60 characters"),
  description: z
    .string()
    .max(300, "Description cannot exceed 300 characters")
    .optional()
    .nullable(),
  projectId: z.string().min(1, "Project ID is required").optional(),
});

export const deleteTeamSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
});

export const addTeamMemberSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  userId: z.string().min(1, "User ID is required"),
  role: z.nativeEnum(TeamRole).default(TeamRole.MEMBER),
});

export const updateTeamMemberRoleSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  userId: z.string().min(1, "User ID is required"),
  role: z.nativeEnum(TeamRole),
});

export const removeTeamMemberSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type DeleteTeamInput = z.infer<typeof deleteTeamSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberRoleInput = z.infer<typeof updateTeamMemberRoleSchema>;
export type RemoveTeamMemberInput = z.infer<typeof removeTeamMemberSchema>;
