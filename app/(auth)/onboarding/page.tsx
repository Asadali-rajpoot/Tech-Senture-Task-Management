"use client";

import React, { useActionState } from "react";
import { createWorkspaceAction } from "@/app/(auth)/onboarding/actions";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const teamSizeOptions = [
  { value: "1-5", label: "1–5 people", desc: "Small team or startup" },
  { value: "6-15", label: "6–15 people", desc: "Growing department" },
  { value: "16-50", label: "16–50 people", desc: "Mid-size company" },
  { value: "50+", label: "50+ people", desc: "Enterprise organization" },
];

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    undefined
  );

  return (
    <div className="space-y-6">
      {/* Progress Header - Step 2 of 2 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-primary text-xs font-semibold tracking-wider uppercase">
            Step 2 of 2
          </span>
          <div className="text-muted flex items-center gap-1.5 text-xs">
            <span className="text-success inline-flex items-center gap-1 font-medium">
              <CheckCircle2 className="size-3.5" /> Account created
            </span>
          </div>
        </div>

        <div className="bg-border h-1.5 w-full overflow-hidden rounded-full">
          <div className="bg-primary h-full w-full rounded-full transition-all duration-500" />
        </div>

        <div className="space-y-1">
          <h1 className="text-text text-xl font-bold tracking-tight">
            Create your workspace
          </h1>
          <p className="text-muted text-xs leading-relaxed">
            Set up an organization workspace to start managing projects, teams,
            and tasks.
          </p>
        </div>
      </div>

      {state?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-text block text-xs font-semibold"
          >
            Workspace / Organization Name
          </label>
          <div className="relative">
            <Building2 className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Acme Corporation"
              className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-text block text-xs font-semibold">
            Expected Team Size
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {teamSizeOptions.map((opt) => (
              <label
                key={opt.value}
                className="border-border hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 relative flex cursor-pointer rounded-lg border p-3 transition-all"
              >
                <input
                  type="radio"
                  name="teamSize"
                  value={opt.value}
                  defaultChecked={opt.value === "1-5"}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="text-text flex items-center gap-1.5 text-xs font-semibold">
                    <Users className="text-muted size-3.5" />
                    {opt.label}
                  </span>
                  <span className="text-muted mt-0.5 text-[11px]">
                    {opt.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 mt-2 w-full gap-2 rounded-lg py-2 text-sm font-medium text-white shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Creating workspace...</span>
            </>
          ) : (
            <>
              <span>Complete Setup</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
