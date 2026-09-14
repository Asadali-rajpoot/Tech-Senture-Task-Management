import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAppSettings } from "@/lib/data/app-settings";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `Login | ${settings.appName}`,
    description: `Sign in to continue to your ${settings.appName} workspace.`,
  };
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();

  return <LoginForm appName={settings.appName} />;
}
