"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Settings,
  Palette,
  Menu,
  X,
  Bell,
  Search,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { logoutAction } from "@/app/(auth)/actions";

interface AppShellProps {
  children: React.ReactNode;
  appName?: string;
  workspaceName?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    orgRole?: string | null;
  };
}

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Tasks", href: "/tasks/board", icon: CheckSquare },
  { name: "Members", href: "/settings/members", icon: Users },
  { name: "Settings", href: "/settings/organization", icon: Settings },
  { name: "Color Tokens (Dev)", href: "/dev/colors", icon: Palette },
];

export function AppShell({
  children,
  appName = "Tech Senture",
  workspaceName = "Acme Corp",
  user = { name: "Maya Lin", email: "maya@acme.com", orgRole: "ORG_OWNER" },
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="bg-background text-text flex min-h-screen flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="bg-card border-border sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm">
            <Layers className="size-5" />
          </div>
          <span className="text-text text-base font-bold tracking-tight">
            {appName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
            className="text-muted hover:text-text"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Backdrop & Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`bg-card border-border fixed top-0 bottom-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 ease-in-out md:sticky md:translate-x-0 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        } h-screen`}
      >
        {/* Brand Header */}
        <div className="border-border flex h-16 items-center justify-between border-b px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              <Layers className="size-5" />
            </div>
            <span className="text-text text-lg font-bold tracking-tight">
              {appName}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted size-8 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Organization Switcher / Workspace Indicator */}
        <div className="border-border/60 border-b px-4 py-3">
          <div className="bg-background border-border flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
            <div className="flex min-w-0 flex-col">
              <span className="text-muted text-[10px] font-semibold tracking-wider uppercase">
                Workspace
              </span>
              <span className="text-text truncate font-medium">
                {workspaceName}
              </span>
            </div>
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold">
              {user.orgRole || "ORG_MEMBER"}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary font-semibold text-white shadow-xs"
                    : "text-muted hover:text-text hover:bg-background"
                }`}
              >
                <Icon
                  className={`size-4 ${isActive ? "text-white" : "text-muted"}`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Footer & Logout */}
        <div className="border-border mt-auto space-y-2 border-t p-4">
          <div className="bg-background border-border/50 flex items-center gap-3 rounded-lg border px-2 py-1.5">
            <div className="bg-secondary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white">
              {user.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase()
                : "U"}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-text truncate text-xs font-medium">
                {user.name || "User"}
              </span>
              <span className="text-muted truncate text-[11px]">
                {user.email || ""}
              </span>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger hover:bg-danger/10 w-full justify-start px-2 text-xs"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop Topbar */}
        <header className="bg-card border-border sticky top-0 z-30 hidden h-16 items-center justify-between border-b px-8 md:flex">
          <div className="flex w-96 items-center gap-4">
            <div className="relative w-full">
              <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects, teams, tasks..."
                className="bg-background border-border text-text placeholder:text-muted focus:ring-primary/20 focus:border-primary w-full rounded-lg border py-1.5 pr-4 pl-9 text-xs transition-all focus:ring-2 focus:outline-none"
                disabled
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted hover:text-text relative size-8"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="bg-danger absolute top-1.5 right-1.5 size-2 rounded-full" />
            </Button>

            <Link href="/dev/colors">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Palette className="text-secondary size-3.5" />
                <span>Color Tokens</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="bg-background flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
