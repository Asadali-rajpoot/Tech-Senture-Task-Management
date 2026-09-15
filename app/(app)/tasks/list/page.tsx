import { Suspense } from "react";
import { requireOrg } from "@/lib/api/proxy";
import { getOrgTasks, getOrgTeamsWithMembers } from "@/lib/data/tasks";
import { TaskListClient, TaskItem, TeamWithMembers } from "./task-list-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks | PROXima",
  description: "View and manage tasks across your teams.",
};

export default async function TaskListPage() {
  const session = await requireOrg();
  const organizationId = session.user.organizationId;

  const [tasks, teams] = await Promise.all([
    getOrgTasks(organizationId),
    getOrgTeamsWithMembers(organizationId),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading tasks...</div>}>
      <TaskListClient
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
