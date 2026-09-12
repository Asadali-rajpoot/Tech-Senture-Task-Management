import React from "react";
import { requireAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { NotificationsSettingsClient } from "./notifications-settings-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notification Settings | Tech Senture",
  description: "Configure email alerts, task reminders, and digest preferences.",
};

export default async function NotificationsSettingsPage() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      notifyEmail: true,
      notifyTaskReminders: true,
      notifyWeeklyDigest: true,
    },
  });

  return (
    <NotificationsSettingsClient
      initialPreferences={{
        notifyEmail: user?.notifyEmail ?? true,
        notifyTaskReminders: user?.notifyTaskReminders ?? true,
        notifyWeeklyDigest: user?.notifyWeeklyDigest ?? true,
      }}
    />
  );
}
