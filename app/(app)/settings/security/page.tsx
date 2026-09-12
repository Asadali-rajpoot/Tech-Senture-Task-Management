import React from "react";
import { Metadata } from "next";
import { requireAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { SecurityClient } from "./security-client";

export const metadata: Metadata = {
  title: "Security Settings | Tech Senture",
  description: "Manage account password and two-factor authentication.",
};

export default async function SecuritySettingsPage() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true },
  });

  return (
    <SecurityClient
      twoFactorInitial={user?.twoFactorEnabled ?? false}
    />
  );
}
