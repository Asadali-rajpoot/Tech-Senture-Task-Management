import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { requireAuth } from "@/lib/api/proxy";
import {
  User,
  Shield,
  Building2,
  Users,
  Bell,
  ArrowRight,
  Palette,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Settings | Tech Senture",
  description: "Account profile, security, workspace parameters, and notification settings.",
};

const settingsCategories = [
  {
    title: "Profile & Account",
    description: "Your full name, work email address, and avatar photo.",
    href: "/settings/profile",
    icon: User,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Security & 2FA",
    description: "Password updates, credential management, and two-factor authentication.",
    href: "/settings/security",
    icon: Shield,
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    title: "Organization & Admin Branding",
    description: "Workspace profile, multi-tenant parameters, and dynamic brand name.",
    href: "/settings/organization",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Members & Permissions",
    description: "Workspace user roster, role management, and pending email invitations.",
    href: "/settings/members",
    icon: Users,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    title: "Notifications",
    description: "Email alert preferences, task reminders, and weekly digest subscriptions.",
    href: "/settings/notifications",
    icon: Bell,
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

export default async function SettingsHubPage() {
  const session = await requireAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <h1 className="text-text text-2xl font-bold tracking-tight">Settings Hub</h1>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Configure your personal profile, security preferences, and workspace parameters.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.href}
              href={cat.href}
              className="border-border bg-card hover:border-primary/50 hover:bg-background/80 group rounded-xl border p-5 shadow-xs transition-all flex items-start justify-between"
            >
              <div className="flex items-start gap-3.5 pr-2">
                <div className={`${cat.bg} ${cat.color} flex size-10 shrink-0 items-center justify-center rounded-xl font-bold`}>
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-text group-hover:text-primary transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="text-muted group-hover:text-primary group-hover:translate-x-0.5 size-5 shrink-0 transition-all mt-2.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
