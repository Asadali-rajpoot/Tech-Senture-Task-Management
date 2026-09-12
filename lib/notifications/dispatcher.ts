import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";
import { sendNotificationEmail } from "@/lib/email/notification";

export interface DispatchNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

export async function sendSystemNotification({
  userId,
  type,
  title,
  message,
  link,
}: DispatchNotificationParams) {
  try {
    const recipient = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        notifyEmail: true,
        notifyTaskReminders: true,
      },
    });

    if (!recipient) return null;

    // Check category preferences
    if (type === NotificationType.DUE_DATE && !recipient.notifyTaskReminders) {
      // User disabled task reminder notifications
      return null;
    }

    // 1. Create In-App Notification record
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link: link || null,
      },
    });

    // 2. Dispatch Email if email notifications are enabled by the user
    if (recipient.notifyEmail && recipient.email) {
      await sendNotificationEmail({
        toEmail: recipient.email,
        userName: recipient.name,
        type,
        title,
        message,
        link,
      });
    }

    return notification;
  } catch (err) {
    console.error("Failed to dispatch system notification:", err);
    return null;
  }
}
