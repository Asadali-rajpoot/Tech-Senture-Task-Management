"use server";

import { revalidatePath } from "next/cache";
import { withOrgScope } from "@/lib/api/proxy";
import {
  getSavedViews,
  createSavedView,
  deleteSavedView,
  type SavedViewItem,
} from "@/lib/data/saved-views";

export interface SavedViewActionResponse {
  savedViews?: SavedViewItem[];
  savedView?: SavedViewItem;
  success?: boolean;
  error?: string;
}

export async function getSavedViewsAction(): Promise<SavedViewActionResponse> {
  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      const views = await getSavedViews(user.id, organizationId);
      return { savedViews: views };
    });
  } catch {
    return { error: "Failed to load saved views", savedViews: [] };
  }
}

export async function createSavedViewAction(
  name: string,
  filters: Record<string, any>
): Promise<SavedViewActionResponse> {
  try {
    return await withOrgScope(async ({ user, organizationId }) => {
      if (!name || !name.trim()) {
        return { error: "View name is required" };
      }

      const created = await createSavedView(
        user.id,
        organizationId,
        name,
        JSON.stringify(filters)
      );

      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/tasks/calendar");
      revalidatePath("/tasks/timeline");

      return { success: true, savedView: created };
    });
  } catch (error) {
    console.error("[createSavedViewAction error]", error);
    return { error: "Failed to create saved view" };
  }
}

export async function deleteSavedViewAction(
  id: string
): Promise<SavedViewActionResponse> {
  try {
    return await withOrgScope(async ({ user }) => {
      await deleteSavedView(user.id, id);

      revalidatePath("/tasks/list");
      revalidatePath("/tasks/board");
      revalidatePath("/tasks/calendar");
      revalidatePath("/tasks/timeline");

      return { success: true };
    });
  } catch (error) {
    console.error("[deleteSavedViewAction error]", error);
    return { error: "Failed to delete saved view" };
  }
}
