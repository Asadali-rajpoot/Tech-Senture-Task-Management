import React from "react";
import { requireAuth } from "@/lib/api/proxy";
import { getAppSettings } from "@/lib/data/app-settings";
import { OnboardingForm } from "./onboarding-form";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `Create Workspace | ${settings.appName}`,
    description: `Set up your ${settings.appName} workspace.`,
  };
}

export default async function OnboardingPage() {
  await requireAuth();
  const settings = await getAppSettings();

  return <OnboardingForm appName={settings.appName} />;
}
