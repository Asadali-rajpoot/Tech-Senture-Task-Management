import { db } from "@/lib/db";

export interface SavedViewItem {
  id: string;
  name: string;
  filters: string; // JSON string
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getSavedViews(
  userId: string,
  organizationId: string
): Promise<SavedViewItem[]> {
  return db.savedView.findMany({
    where: {
      userId,
      organizationId,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSavedView(
  userId: string,
  organizationId: string,
  name: string,
  filters: string
): Promise<SavedViewItem> {
  return db.savedView.create({
    data: {
      name: name.trim(),
      filters,
      userId,
      organizationId,
    },
  });
}

export async function deleteSavedView(
  userId: string,
  id: string
): Promise<{ success: boolean }> {
  await db.savedView.deleteMany({
    where: {
      id,
      userId,
    },
  });
  return { success: true };
}
