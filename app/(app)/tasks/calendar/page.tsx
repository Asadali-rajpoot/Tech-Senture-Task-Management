import { Suspense } from "react";
import { requireOrg } from "@/lib/api/proxy";
import { getOrgTasks, getOrgTeamsWithMembers } from "@/lib/data/tasks";
import { CalendarClient } from "./calendar-client";
import { TaskItem, TeamWithMembers } from "../list/task-list-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar | Tech Senture",
  description: "Monthly calendar view for scheduled tasks and deadlines.",
};

export default async function CalendarPage() {
  const session = await requireOrg();
  const organizationId = session.user.organizationId;

  const [tasks, teams] = await Promise.all([
    getOrgTasks(organizationId),
    getOrgTeamsWithMembers(organizationId),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading calendar...</div>}>
      <CalendarClient
        initialTasks={tasks as unknown as TaskItem[]}
        teams={teams as unknown as TeamWithMembers[]}
        currentUser={{
          id: session.user.id,
          orgRole: session.user.orgRole,
        }}
      />
    </Suspense>
  );
}
