"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Mail,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  User as UserIcon,
  Building2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferencesAction } from "@/app/(app)/notifications/actions";

interface NotificationPreferences {
  notifyEmail: boolean;
  notifyTaskReminders: boolean;
  notifyWeeklyDigest: boolean;
}

interface NotificationsSettingsClientProps {
  initialPreferences: NotificationPreferences;
}

export function NotificationsSettingsClient({
  initialPreferences,
}: NotificationsSettingsClientProps) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleToggle = (key: keyof NotificationPreferences) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);
    setMessage(null);

    const formData = new FormData();
    formData.append("notifyEmail", String(updated.notifyEmail));
    formData.append("notifyTaskReminders", String(updated.notifyTaskReminders));
    formData.append("notifyWeeklyDigest", String(updated.notifyWeeklyDigest));

    startTransition(async () => {
      const res = await updateNotificationPreferencesAction({}, formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
        // Revert on failure
        setPreferences(preferences);
      } else {
        setMessage({
          type: "success",
          text: "Preferences saved successfully.",
        });
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <Bell className="size-4" />
          </div>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            Notification Settings
          </h1>
        </div>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Control how and when you receive task updates, assignment alerts, and reminders.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border/60 gap-4 text-xs font-semibold">
        <Link
          href="/settings/profile"
          className="pb-2.5 text-muted hover:text-text transition-colors flex items-center gap-1.5"
        >
          <UserIcon className="size-3.5" />
          <span>Profile</span>
        </Link>
        <Link
          href="/settings/organization"
          className="pb-2.5 text-muted hover:text-text transition-colors flex items-center gap-1.5"
        >
          <Building2 className="size-3.5" />
          <span>Workspace</span>
        </Link>
        <Link
          href="/settings/members"
          className="pb-2.5 text-muted hover:text-text transition-colors flex items-center gap-1.5"
        >
          <Users className="size-3.5" />
          <span>Members</span>
        </Link>
        <Link
          href="/settings/notifications"
          className="pb-2.5 border-b-2 border-primary text-primary flex items-center gap-1.5"
        >
          <Bell className="size-3.5" />
          <span>Notifications</span>
        </Link>
      </div>

      {/* Feedback banner */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-4 text-xs animate-in fade-in ${
            message.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Notification Categories Card (PRD §7 Prototype layout) */}
      <div className="border-border bg-card divide-y divide-border rounded-xl border shadow-xs">
        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 text-primary mt-0.5 rounded-lg p-2 shrink-0">
              <Mail className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text">Email Notifications</h3>
              <p className="text-xs text-muted leading-relaxed max-w-lg">
                Receive email notifications for task assignments, comments, and mentions when you're away.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notifyEmail}
              onChange={() => handleToggle("notifyEmail")}
              disabled={isPending}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xs"></div>
          </label>
        </div>

        {/* Task Reminders Toggle */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-start gap-4">
            <div className="bg-warning/10 text-warning mt-0.5 rounded-lg p-2 shrink-0">
              <Clock className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text">Task Reminders</h3>
              <p className="text-xs text-muted leading-relaxed max-w-lg">
                Get reminders for approaching due dates and login alerts for overdue tasks assigned to you.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notifyTaskReminders}
              onChange={() => handleToggle("notifyTaskReminders")}
              disabled={isPending}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xs"></div>
          </label>
        </div>

        {/* Weekly Digest Toggle */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-start gap-4">
            <div className="bg-secondary/10 text-secondary mt-0.5 rounded-lg p-2 shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text">Weekly Digest</h3>
              <p className="text-xs text-muted leading-relaxed max-w-lg">
                Receive a weekly summary email of team progress, completed milestones, and pending work.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.notifyWeeklyDigest}
              onChange={() => handleToggle("notifyWeeklyDigest")}
              disabled={isPending}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-xs"></div>
          </label>
        </div>
      </div>
    </div>
  );
}
