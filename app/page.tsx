import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAppSettings } from "@/lib/data/app-settings";
import { LoginForm } from "@/app/(auth)/login/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings();
  return {
    title: `Login | ${settings.appName}`,
    description: `Sign in to continue to your ${settings.appName} workspace.`,
  };
}

export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const settings = await getAppSettings();

  return (
    <div className="bg-background min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative">
      <LoginForm appName={settings.appName} />
    </div>
  );
}
