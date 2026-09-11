import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/api/proxy";
import { getAppSettings } from "@/lib/data/app-settings";
import { getOrganization } from "@/lib/data/organization";
import { AppShell } from "@/components/shared/app-shell";

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  // If user has not created/joined an organization yet, force through onboarding (Step 2)
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }

  const settings = await getAppSettings();
  const org = await getOrganization(session.user.organizationId);

  return (
    <AppShell
      appName={settings.appName}
      workspaceName={org?.name || "My Workspace"}
      user={{
        name: session.user?.name || "User",
        email: session.user?.email || "",
        orgRole: session.user?.orgRole || "ORG_MEMBER",
      }}
    >
      {children}
    </AppShell>
  );
}
