import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { requireAuth } from "@/lib/api/proxy";
import { getOrganization } from "@/lib/data/organization";
import { getAppSettings } from "@/lib/data/app-settings";
import { OrgEditForm } from "./org-edit-form";
import { AdminBrandingForm } from "./admin-branding-form";
import { Building2, Globe, Shield, Users, Palette, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Organization & Branding Settings | Tech Senture",
  description: "Manage workspace profile, member hierarchy, and application branding.",
};

export default async function OrganizationSettingsPage() {
  const session = await requireAuth();

  const organizationId = session.user.organizationId;
  const org = organizationId ? await getOrganization(organizationId) : null;
  const isOwner = session.user.orgRole === "ORG_OWNER";
  const isOwnerOrAdmin = isOwner || session.user.orgRole === "ORG_ADMIN";

  const appSettings = await getAppSettings();

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="border-border flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Manage your workspace profile, identifiers, and multi-tenant parameters.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/settings/members">
            <Button size="sm" variant="outline" className="gap-2 text-xs">
              <Users className="text-primary size-3.5" />
              <span>Manage Members</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Organization Details Card */}
      <div className="border-border bg-card space-y-6 rounded-xl border p-6 shadow-xs">
        <div className="border-border flex items-center gap-3 border-b pb-4">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl font-bold">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="text-text text-base font-semibold">
              Workspace Profile
            </h2>
            <p className="text-muted text-xs">
              General information about your organization
            </p>
          </div>
        </div>

        <OrgEditForm
          initialName={org?.name || "My Workspace"}
          isOwnerOrAdmin={isOwnerOrAdmin}
        />
      </div>

      {/* Admin Branding Settings Card (ORG_OWNER ONLY - ARCHITECTURE.md §6 / Module 24) */}
      {isOwner && (
        <div className="border-border bg-card space-y-6 rounded-xl border p-6 shadow-xs">
          <div className="border-border flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/10 text-secondary flex size-10 items-center justify-center rounded-xl font-bold">
                <Palette className="size-5" />
              </div>
              <div>
                <h2 className="text-text text-base font-semibold flex items-center gap-2">
                  <span>Application Branding (Admin)</span>
                  <span className="bg-secondary/15 text-secondary border border-secondary/30 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase">
                    Owner Only
                  </span>
                </h2>
                <p className="text-muted text-xs">
                  Configure global platform branding and dynamic display name
                </p>
              </div>
            </div>
          </div>

          <AdminBrandingForm initialAppName={appSettings.appName} />
        </div>
      )}

      {/* Workspace Metadata & Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <div className="text-muted flex items-center gap-2 text-xs font-semibold">
            <Globe className="text-primary size-4" />
            <span>Workspace Slug</span>
          </div>
          <p className="text-text font-mono text-sm font-medium">
            {org?.slug || "not-configured"}
          </p>
          <p className="text-muted text-[11px]">
            Used for unique routing & references
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <div className="text-muted flex items-center gap-2 text-xs font-semibold">
            <Shield className="text-secondary size-4" />
            <span>Your Org Role</span>
          </div>
          <p className="text-text font-mono text-sm font-medium">
            {session.user.orgRole}
          </p>
          <p className="text-muted text-[11px]">
            {session.user.orgRole === "ORG_OWNER"
              ? "Full ownership & admin control"
              : "Organization team member"}
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <div className="text-muted flex items-center gap-2 text-xs font-semibold">
            <Users className="text-success size-4" />
            <span>Total Members</span>
          </div>
          <p className="text-text text-xl font-bold">
            {org?._count?.users || 1}
          </p>
          <p className="text-muted text-[11px]">Across all assigned teams</p>
        </div>
      </div>
    </div>
  );
}
