"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    undefined
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-text text-xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted text-xs">
          Get started with your multi-team project workspace.
        </p>
      </div>

      {state?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
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
            Work email
          </label>
          <div className="relative">
            <Mail className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-text block text-xs font-semibold"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="At least 6 characters"
              className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirmPassword"
            className="text-text block text-xs font-semibold"
          >
            Confirm password
          </label>
          <div className="relative">
            <Lock className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Repeat your password"
              className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 w-full gap-2 rounded-lg py-2 text-sm font-medium text-white shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>Create account</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="border-border border-t pt-4 text-center">
        <p className="text-muted text-xs">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline"
          >
            Sign in to continue
          </Link>
        </p>
      </div>
    </div>
  );
}
