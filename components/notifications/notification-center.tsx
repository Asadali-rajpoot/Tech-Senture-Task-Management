"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  MessageSquare,
  AtSign,
  UserCheck,
  AlertTriangle,
  Check,
  Trash2,
  Settings,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
} from "@/app/(app)/notifications/actions";
import { NotificationType } from "@prisma/client";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await getNotificationsAction();
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications as unknown as NotificationItem[]);
        setUnreadCount(res.unreadCount ?? 0);
      }
    } catch {
      // Silently ignore background polling errors when session is unauthenticated
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await markNotificationAsReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await deleteNotificationAction(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadNotifications();
    });
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.isRead : true
  );

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ASSIGNMENT:
        return <UserCheck className="size-4 text-primary" />;
      case NotificationType.MENTION:
        return <AtSign className="size-4 text-secondary" />;
      case NotificationType.COMMENT:
        return <MessageSquare className="size-4 text-primary" />;
      case NotificationType.DUE_DATE:
        return <AlertTriangle className="size-4 text-warning" />;
      default:
        return <Bell className="size-4 text-muted" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        aria-label="Notifications"
        className="relative size-8 text-muted hover:text-text"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-danger text-white absolute -top-0.5 -right-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2 ring-card shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="border-border bg-card text-text absolute right-0 mt-2 w-[340px] sm:w-[380px] rounded-xl border shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isPending}
                  className="h-6 px-2 text-[11px] text-muted hover:text-primary"
                >
                  <Check className="size-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Link
                href="/settings/notifications"
                onClick={() => setIsOpen(false)}
                title="Notification Settings"
                className="text-muted hover:text-text rounded p-1 hover:bg-muted/10 transition-colors"
              >
                <Settings className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-border/50 px-4 py-1.5 gap-2 bg-muted/10 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "all"
                  ? "bg-card text-text shadow-xs font-semibold"
                  : "text-muted hover:text-text"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filter === "unread"
                  ? "bg-card text-text shadow-xs font-semibold"
                  : "text-muted hover:text-text"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List Feed */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="bg-muted/20 text-muted mx-auto flex size-10 items-center justify-center rounded-full">
                  <CheckCircle2 className="size-5" />
                </div>
                <p className="text-xs font-medium text-text">You're all caught up!</p>
                <p className="text-[11px] text-muted">
                  No {filter === "unread" ? "unread" : ""} notifications at this time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`group relative p-3.5 transition-colors flex items-start gap-3 hover:bg-muted/10 ${
                    !n.isRead ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="mt-0.5 rounded-lg border border-border/60 bg-background p-1.5 shadow-2xs shrink-0">
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs truncate ${!n.isRead ? "font-bold text-text" : "font-medium text-text/80"}`}>
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <div className="size-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted/80">
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.isRead) markNotificationAsReadAction(n.id);
                            setIsOpen(false);
                          }}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          View task →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        className="text-muted hover:text-success p-1 rounded hover:bg-muted/20"
                      >
                        <Check className="size-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      title="Delete notification"
                      className="text-muted hover:text-danger p-1 rounded hover:bg-muted/20"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2 bg-muted/5 text-center">
            <Link
              href="/settings/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-muted hover:text-primary font-medium"
            >
              Configure notification preferences →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
