import React from "react";
import { Metadata } from "next";
import { requireOrg } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { getOrgAnalytics } from "@/lib/data/analytics";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { TaskStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Dashboard | Tech Senture",
  description: "Organization overview, project metrics, and team workload analytics.",
};

export default async function DashboardPage() {
  const session = await requireOrg();
  const organizationId = session.user.organizationId;
  const userId = session.user.id;

  // Time-of-day greeting (PRD.md §7.1)
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const firstName = session.user?.name
    ? session.user.name.split(" ")[0]
    : "User";

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  // Fetch comprehensive analytics, active projects, and user reminders
  const [analytics, activeProjects, userOverdueTasks, userUpcomingTasks] =
    await Promise.all([
      getOrgAnalytics(organizationId),
      db.project.findMany({
        where: { organizationId, isArchived: false },
        include: {
          teams: {
            select: {
              id: true,
              name: true,
              _count: { select: { tasks: true } },
            },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      // Overdue tasks assigned to the logged in user (PRD §6.5.3)
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: { not: TaskStatus.DONE },
          dueDate: { lt: now },
        },
        include: {
          team: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      // Upcoming tasks due soon assigned to the logged in user
      db.task.findMany({
        where: {
          assigneeId: userId,
          status: { not: TaskStatus.DONE },
          dueDate: { gte: now, lte: threeDaysFromNow },
        },
        include: {
          team: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
    ]);

  return (
    <DashboardClient
      analytics={analytics}
      greeting={greeting}
      firstName={firstName}
      activeProjects={activeProjects}
      userOverdueTasks={userOverdueTasks}
      userUpcomingTasks={userUpcomingTasks}
    />
  );
}
