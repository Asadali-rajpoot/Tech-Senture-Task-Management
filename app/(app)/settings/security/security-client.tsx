"use client";

import React, { useActionState, useState, useTransition } from "react";
import {
  Shield,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  changePasswordAction,
  toggleTwoFactorAction,
  type SecurityActionResponse,
} from "./actions";

interface SecurityClientProps {
  twoFactorInitial: boolean;
}

export function SecurityClient({ twoFactorInitial }: SecurityClientProps) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(twoFactorInitial);
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [is2FAPending, start2FATransition] = useTransition();

  const [passwordState, passwordFormAction, isPasswordPending] = useActionState<
    SecurityActionResponse,
    FormData
  >(changePasswordAction, {});

  const handleToggle2FA = () => {
    const nextState = !twoFactorEnabled;
    start2FATransition(async () => {
      const res = await toggleTwoFactorAction(nextState);
      if (res.success) {
        setTwoFactorEnabled(nextState);
        setTwoFactorNotice(res.success);
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <h1 className="text-text text-2xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Manage your account credentials, password, and two-factor authentication.
        </p>
      </div>

      {/* Change Password Card */}
      <div className="border-border bg-card rounded-2xl border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border/60">
          <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl font-bold">
            <KeyRound className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">Change Password</h2>
            <p className="text-xs text-muted">
              Update your account password to maintain high security.
            </p>
          </div>
        </div>

        {passwordState.error && (
          <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-xl border p-4 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{passwordState.error}</p>
          </div>
        )}

        {passwordState.success && (
          <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-xl border p-4 text-xs">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>{passwordState.success}</p>
          </div>
        )}

        <form action={passwordFormAction} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <Lock className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="Enter current password"
                className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-4 pl-10 text-xs sm:text-sm focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="newPassword"
                className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-4 pl-10 text-xs sm:text-sm focus:ring-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-4 pl-10 text-xs sm:text-sm focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPasswordPending}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-6 h-9 shadow-xs"
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update password</span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication Card (PRD §7) */}
      <div className="border-border bg-card rounded-2xl border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/10 text-secondary flex size-10 items-center justify-center rounded-xl font-bold">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                Two-Factor Authentication (2FA)
              </h2>
              <p className="text-xs text-muted">
                Add an extra layer of security to your account during login.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              twoFactorEnabled
                ? "bg-success/15 text-success border border-success/30"
                : "bg-muted/15 text-muted border border-border"
            }`}
          >
            {twoFactorEnabled ? (
              <>
                <ShieldCheck className="size-3.5" />
                <span>Enabled</span>
              </>
            ) : (
              <>
                <ShieldAlert className="size-3.5" />
                <span>Disabled</span>
              </>
            )}
          </span>
        </div>

        {twoFactorNotice && (
          <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-xl border p-4 text-xs">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>{twoFactorNotice}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-background/80 border border-border/70 rounded-xl p-5">
          <div className="space-y-1 max-w-lg">
            <h3 className="text-sm font-semibold text-text">
              {twoFactorEnabled ? "2FA Protection Active" : "Enable Two-Factor Authentication"}
            </h3>
            <p className="text-xs text-muted">
              {twoFactorEnabled
                ? "Your account is protected. Extra verification is required when signing in."
                : "Protect your account from unauthorized access with secondary authentication."}
            </p>
          </div>

          <Button
            type="button"
            variant={twoFactorEnabled ? "outline" : "default"}
            size="sm"
            onClick={handleToggle2FA}
            disabled={is2FAPending}
            className={`text-xs font-semibold shrink-0 ${
              !twoFactorEnabled ? "bg-primary hover:bg-primary/90 text-white" : ""
            }`}
          >
            {is2FAPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : twoFactorEnabled ? (
              "Disable 2FA"
            ) : (
              "Enable 2FA"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
