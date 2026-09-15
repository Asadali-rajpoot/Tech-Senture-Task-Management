"use client";

import React, { useActionState, useState } from "react";
import Image from "next/image";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateAdminBrandingAction, type UpdateOrgState } from "./actions";

interface AdminBrandingFormProps {
  initialAppName: string;
}

export function AdminBrandingForm({ initialAppName }: AdminBrandingFormProps) {
  const [appName, setAppName] = useState(initialAppName);
  const [state, formAction, isPending] = useActionState<
    UpdateOrgState,
    FormData
  >(updateAdminBrandingAction, {});

  return (
    <div className="space-y-6">
      <div className="border-border border-b pb-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="size-4" />
          <h2 className="text-text text-base font-semibold">
            Admin Application Branding
          </h2>
        </div>
        <p className="text-muted mt-1 text-xs">
          Configure the global application title displayed across navigation, mobile views, page titles, and email templates. (Org Owner Only)
        </p>
      </div>

      {state.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-center gap-2 rounded-lg border p-3 text-xs">
          <CheckCircle2 className="size-4 shrink-0" />
          <p>{state.success}</p>
        </div>
      )}

      {state.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-center gap-2 rounded-lg border p-3 text-xs">
          <AlertCircle className="size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4 max-w-xl">
        <div className="space-y-1.5">
          <label
            htmlFor="appName"
            className="text-text block text-xs font-semibold"
          >
            Application Display Name *
          </label>
          <input
            id="appName"
            name="appName"
            type="text"
            required
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. PROXima"
            className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border px-3.5 text-xs sm:text-sm focus:ring-2 focus:outline-none"
          />
          <p className="text-[11px] text-muted mt-1.5">
            Changing this updates the brand name across the sidebar, header, page titles, and email templates dynamically.
          </p>
        </div>

        {/* Live Brand Preview */}
        <div className="bg-background/80 border border-border/70 rounded-xl p-4 space-y-2">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
            Live Preview (Header & Navigation)
          </span>
          <div className="flex items-center gap-2.5">
            <div className="relative size-8 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/icon.png"
                alt={appName}
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-text text-base font-bold tracking-tight">
              {appName || "PROXima"}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !appName.trim()}
            className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-6 h-9 shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                <span>Saving brand name...</span>
              </>
            ) : (
              <span>Save branding</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
