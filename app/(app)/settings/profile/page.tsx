import React from "react";
import { Metadata } from "next";
import { requireAuth } from "@/lib/api/proxy";
import { db } from "@/lib/db";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profile Settings | PROXima",
  description: "Manage your personal account profile, work email, and avatar.",
};

export default async function ProfileSettingsPage() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      organization: {
        select: { name: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        orgRole: user.orgRole,
        organizationName: user.organization?.name,
      }}
    />
  );
}
