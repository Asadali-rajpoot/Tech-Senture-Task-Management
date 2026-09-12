import React from "react";
import { getAppSettings } from "@/lib/data/app-settings";
import { SignupForm } from "./signup-form";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `Sign Up | ${settings.appName}`,
    description: `Create your ${settings.appName} account.`,
  };
}

export default async function SignupPage() {
  const settings = await getAppSettings();

  return <SignupForm appName={settings.appName} />;
}
