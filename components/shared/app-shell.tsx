"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";
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
];

export function AppShell({
  children,
  appName = "PROXima",
  workspaceName = "Acme Corp",
  user = { name: "Maya Lin", email: "maya@acme.com", orgRole: "ORG_OWNER" },
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();

  // Listen for global Cmd+K or Ctrl+K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="bg-background text-text flex min-h-screen flex-col md:flex-row">
      {/* Global Search Dialog Modal */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Mobile Topbar */}
      <header className="bg-card border-border sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
          >
            <div className="relative size-8 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/icon.png"
                alt={appName}
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <span className="text-text text-lg font-bold tracking-tight">
              {appName}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="text-muted hover:text-text"
          >
            <Search className="size-5" />
          </Button>
          <NotificationCenter />
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
        <div className="border-border flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="relative size-8 shrink-0 overflow-hidden rounded-lg transition-transform group-hover:scale-105">
              <Image
                src="/icon.png"
                alt={appName}
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
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

        {/* Lower Section: Settings, Profile & Logout */}
        <div className="border-border mt-auto space-y-2 border-t p-3">
          {/* Settings Nav Item */}
          <Link
            href="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              pathname === "/settings" ||
              (pathname?.startsWith("/settings") &&
                pathname !== "/settings/profile" &&
                pathname !== "/settings/members")
                ? "bg-primary font-semibold text-white shadow-xs"
                : "text-muted hover:text-text hover:bg-background"
            }`}
          >
            <Settings
              className={`size-4 ${
                pathname === "/settings" ||
                (pathname?.startsWith("/settings") &&
                  pathname !== "/settings/profile" &&
                  pathname !== "/settings/members")
                  ? "text-white"
                  : "text-muted"
              }`}
            />
            <span>Settings</span>
          </Link>

          {/* User Profile Card */}
          <Link
            href="/settings/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-colors ${
              pathname === "/settings/profile"
                ? "border-primary/50 bg-primary/5"
                : "bg-background border-border/50 hover:bg-muted/5"
            }`}
          >
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
          </Link>

          {/* Sign Out Action */}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-danger hover:text-danger hover:bg-danger/10 w-full justify-start px-2.5 text-xs font-medium"
            >
              <LogOut className="mr-2 size-3.5 text-danger" />
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop Topbar */}
        <header className="bg-card border-border sticky top-0 z-30 hidden h-16 items-center justify-between border-b px-8 md:flex">
          <div className="flex w-96 items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="bg-background border-border text-muted hover:text-text hover:border-primary/50 relative flex w-full items-center justify-between rounded-lg border py-1.5 pr-3 pl-9 text-xs transition-all shadow-2xs"
            >
              <Search className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <span>Search projects, teams, tasks...</span>
              <kbd className="border-border bg-card text-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
                Cmd+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
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
