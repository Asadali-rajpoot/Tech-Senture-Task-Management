"use client";

import React, { useActionState } from "react";
import {
  updateOrganizationAction,
  type UpdateOrgState,
} from "@/app/(app)/settings/organization/actions";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface OrgEditFormProps {
  initialName: string;
  isOwnerOrAdmin: boolean;
}

export function OrgEditForm({ initialName, isOwnerOrAdmin }: OrgEditFormProps) {
  const [state, formAction, isPending] = useActionState<
    UpdateOrgState,
    FormData
  >(updateOrganizationAction, {});

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {state?.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-lg border p-3.5 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{state.success}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-text block text-xs font-semibold">
          Organization / Workspace Name
        </label>
        <div className="relative">
          <Building2 className="text-muted absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialName}
            disabled={!isOwnerOrAdmin || isPending}
            placeholder="e.g. Acme Corporation"
            className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 w-full rounded-lg border py-2 pr-3 pl-9 text-sm transition-all focus:ring-2 focus:outline-none disabled:opacity-60"
          />
        </div>
        {!isOwnerOrAdmin && (
          <p className="text-muted text-[11px]">
            Only Organization Owners and Admins can rename this workspace.
          </p>
        )}
      </div>

      {isOwnerOrAdmin && (
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
