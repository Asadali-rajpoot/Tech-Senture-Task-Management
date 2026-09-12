"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { withAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validation/security";

export interface SecurityActionResponse {
  success?: string;
  error?: string;
  twoFactorEnabled?: boolean;
}

export async function changePasswordAction(
  prevState: SecurityActionResponse,
  formData: FormData
): Promise<SecurityActionResponse> {
  try {
    return await withAuth(async ({ user }) => {
      const currentPassword = formData.get("currentPassword") as string;
      const newPassword = formData.get("newPassword") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      const parsed = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message || "Invalid input data",
        };
      }

      if (!user.passwordHash) {
        return { error: "Account does not have a local password configured" };
      }

      const isValid = await bcrypt.compare(
        parsed.data.currentPassword,
        user.passwordHash
      );

      if (!isValid) {
        return { error: "Incorrect current password" };
      }

      const newHash = await bcrypt.hash(parsed.data.newPassword, 10);

      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
        },
      });

      revalidatePath("/settings/security");

      return { success: "Password changed successfully" };
    });
  } catch (error) {
    console.error("[changePasswordAction error]", error);
    return { error: "Failed to change password" };
  }
}

export async function toggleTwoFactorAction(
  enabled: boolean
): Promise<SecurityActionResponse> {
  try {
    return await withAuth(async ({ user }) => {
      await db.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: enabled,
        },
      });

      revalidatePath("/settings/security");

      return {
        success: enabled
          ? "Two-Factor Authentication has been enabled."
          : "Two-Factor Authentication has been disabled.",
        twoFactorEnabled: enabled,
      };
    });
  } catch (error) {
    console.error("[toggleTwoFactorAction error]", error);
    return { error: "Failed to update Two-Factor Authentication setting" };
  }
}
