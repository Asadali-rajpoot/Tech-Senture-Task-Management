import { db } from "@/lib/db";

export async function getAppSettings() {
  try {
    const settings = await db.appSettings.findFirst();
    if (settings) {
      return settings;
    }
  } catch {
    // Return fallback if database is not reachable
  }

  return {
    id: "default-settings",
    appName: "Tech Senture",
  };
}
