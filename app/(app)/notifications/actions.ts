"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { z } from "zod";

export type NotificationActionResponse = {
  error?: string;
  success?: string;
};

const updatePreferencesSchema = z.object({
  notifyEmail: z.boolean(),
  notifyTaskReminders: z.boolean(),
  notifyWeeklyDigest: z.boolean(),
});

export async function getNotificationsAction() {
  try {
    return await withAuth(async ({ user }) => {
      const [notifications, unreadCount] = await Promise.all([
        db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        db.notification.count({
          where: { userId: user.id, isRead: false },
        }),
      ]);

      return {
        notifications,
        unreadCount,
      };
    });
  } catch {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }
}

export async function markNotificationAsReadAction(notificationId: string) {
  try {
    return await withAuth(async ({ user }) => {
      await db.notification.updateMany({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true },
      });

      revalidatePath("/", "layout");
      return { success: "Notification marked as read" };
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to mark as read",
    };
  }
}

export async function markAllNotificationsAsReadAction() {
  try {
    return await withAuth(async ({ user }) => {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      revalidatePath("/", "layout");
      return { success: "All notifications marked as read" };
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to mark all as read",
    };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  try {
    return await withAuth(async ({ user }) => {
      await db.notification.deleteMany({
        where: { id: notificationId, userId: user.id },
      });

      revalidatePath("/", "layout");
      return { success: "Notification deleted" };
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete notification",
    };
  }
}

export async function updateNotificationPreferencesAction(
  _prevState: NotificationActionResponse,
  formData: FormData
): Promise<NotificationActionResponse> {
  const rawData = {
    notifyEmail:
      formData.get("notifyEmail") === "on" ||
      formData.get("notifyEmail") === "true",
    notifyTaskReminders:
      formData.get("notifyTaskReminders") === "on" ||
      formData.get("notifyTaskReminders") === "true",
    notifyWeeklyDigest:
      formData.get("notifyWeeklyDigest") === "on" ||
      formData.get("notifyWeeklyDigest") === "true",
  };

  const parsed = updatePreferencesSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Invalid notification preferences" };
  }

  try {
    return await withAuth(async ({ user }) => {
      await db.user.update({
        where: { id: user.id },
        data: parsed.data,
      });

      revalidatePath("/settings/notifications");
      return { success: "Notification preferences saved successfully!" };
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to update notification preferences",
    };
  }
}
