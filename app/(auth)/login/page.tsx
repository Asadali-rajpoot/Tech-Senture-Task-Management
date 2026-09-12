import React from "react";
import { getAppSettings } from "@/lib/data/app-settings";
import { LoginForm } from "./login-form";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `Login | ${settings.appName}`,
    description: `Sign in to continue to your ${settings.appName} workspace.`,
  };
}

export default async function LoginPage() {
  const settings = await getAppSettings();

  return <LoginForm appName={settings.appName} />;
}
