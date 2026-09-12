"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation/profile";

export interface ProfileActionResponse {
  success?: string;
  error?: string;
}

export async function updateProfileAction(
  prevState: ProfileActionResponse,
  formData: FormData
): Promise<ProfileActionResponse> {
  try {
    return await withAuth(async ({ user }) => {
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const image = formData.get("image") as string;

      const parsed = updateProfileSchema.safeParse({
        name,
        email,
        image: image || null,
      });

      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message || "Invalid input data",
        };
      }

      // If email changed, check if it's taken by another user
      if (parsed.data.email !== user.email) {
        const existing = await db.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (existing && existing.id !== user.id) {
          return { error: "This email is already in use by another account" };
        }
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          image: parsed.data.image,
        },
      });

      revalidatePath("/", "layout");
      revalidatePath("/settings/profile");

      return { success: "Profile updated successfully" };
    });
  } catch (error) {
    console.error("[updateProfileAction error]", error);
    return { error: "Failed to update profile" };
  }
}
