"use client";

import React, { useActionState, useState } from "react";
import { Sparkles, Layers, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
      {state.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-xl border p-4 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-xl border p-4 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{state.success}</p>
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <div>
          <label
            htmlFor="appName"
            className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5"
          >
            Application Display Name
          </label>
          <input
            id="appName"
            name="appName"
            type="text"
            required
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="e.g. Tech Senture"
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
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-xs">
              <Layers className="size-5" />
            </div>
            <span className="text-text text-base font-bold tracking-tight">
              {appName || "Tech Senture"}
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
