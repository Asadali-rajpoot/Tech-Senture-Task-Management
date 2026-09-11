"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { acceptInvitationAction, signupWithInviteAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  CheckCircle2,
  Lock,
  Mail,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface InviteClientProps {
  token: string;
  email: string;
  isLoggedIn: boolean;
  currentUserEmail?: string | null;
}

export function InviteClient({
  token,
  email,
  isLoggedIn,
  currentUserEmail,
}: InviteClientProps) {
  const [acceptState, acceptFormAction, isAcceptPending] = useActionState(
    acceptInvitationAction.bind(null, token),
    undefined
  );

  const [signupState, signupFormAction, isSignupPending] = useActionState(
    signupWithInviteAction.bind(null, token),
    undefined
  );

  return (
    <div className="space-y-4">
      {acceptState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{acceptState.error}</p>
        </div>
      )}

      {signupState?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{signupState.error}</p>
        </div>
      )}

      {isLoggedIn ? (
        <div className="border-border bg-background space-y-4 rounded-xl border p-5 text-center">
          <p className="text-text text-xs">
            You are signed in as <strong>{currentUserEmail}</strong>.
          </p>
          <form action={acceptFormAction}>
            <Button
              type="submit"
              disabled={isAcceptPending}
              className="bg-primary hover:bg-primary/90 w-full gap-2 text-white"
            >
              {isAcceptPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              <span>Accept & Join Workspace</span>
            </Button>
          </form>
        </div>
      ) : (
        <form action={signupFormAction} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-text block text-xs font-semibold"
            >
              Full name
            </label>
            <div className="relative">
              <User className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Jane Doe"
                className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-text block text-xs font-semibold"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={email}
                readOnly
                className="border-border bg-muted/10 text-text w-full rounded-lg border py-2 pr-3 pl-9 text-sm opacity-80 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-text block text-xs font-semibold"
            >
              Set your password
            </label>
            <div className="relative">
              <Lock className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="At least 6 characters"
                className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSignupPending}
            className="bg-primary hover:bg-primary/90 mt-2 w-full gap-2 rounded-lg py-2 text-sm font-medium text-white shadow-xs"
          >
            {isSignupPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            <span>Create Account & Join</span>
          </Button>

          <div className="pt-2 text-center">
            <p className="text-muted text-xs">
              Already have an account?{" "}
              <Link
                href={`/login?callbackUrl=/invite/${token}`}
                className="text-primary font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
