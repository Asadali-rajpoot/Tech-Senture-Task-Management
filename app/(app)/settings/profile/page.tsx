import React from "react";
import Link from "next/link";
import { requireAuth } from "@/lib/api/proxy";
import { Building2, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProfileSettingsPage() {
  const session = await requireAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <h1 className="text-text text-2xl font-bold tracking-tight">
          Account Profile
        </h1>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Your personal account details and organization workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Card */}
        <div className="border-border bg-card space-y-6 rounded-xl border p-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="bg-secondary flex size-16 items-center justify-center rounded-full text-lg font-bold text-white">
              {session.user.name
                ? session.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "U"}
            </div>
            <div>
              <h2 className="text-text text-lg font-semibold">
                {session.user.name || "User"}
              </h2>
              <p className="text-muted mt-0.5 flex items-center gap-1 text-xs">
                <Mail className="size-3.5" />
                {session.user.email}
              </p>
              <span className="bg-primary/10 text-primary mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                {session.user.orgRole}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Link Card */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl font-bold">
              <Building2 className="size-5" />
            </div>
            <div>
              <h3 className="text-text text-sm font-semibold">
                Organization & Workspace Settings
              </h3>
              <p className="text-muted text-xs">
                Manage workspace profile, members, and project hierarchy.
              </p>
            </div>
          </div>

          <Link href="/settings/organization">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <span>Manage Workspace</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
