"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Kanban,
  LayoutList,
  CalendarDays,
  GanttChartSquare,
} from "lucide-react";

export type TaskViewType = "board" | "list" | "calendar" | "timeline";

interface TaskViewSwitcherProps {
  currentView?: TaskViewType;
  className?: string;
}

const VIEW_TABS: Array<{
  id: TaskViewType;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "board", name: "Board", href: "/tasks/board", icon: Kanban },
  { id: "list", name: "List", href: "/tasks/list", icon: LayoutList },
  { id: "calendar", name: "Calendar", href: "/tasks/calendar", icon: CalendarDays },
  { id: "timeline", name: "Timeline", href: "/tasks/timeline", icon: GanttChartSquare },
];

export function TaskViewSwitcher({
  currentView,
  className = "",
}: TaskViewSwitcherProps) {
  const pathname = usePathname();

  return (
    <div
      className={`border-border bg-card flex items-center rounded-lg border p-1 shadow-xs ${className}`}
    >
      {VIEW_TABS.map((tab) => {
        const isActive =
          currentView !== undefined
            ? currentView === tab.id
            : pathname === tab.href || pathname?.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
              isActive
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-muted hover:text-text font-medium"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
