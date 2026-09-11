import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { getAppSettings } from "@/lib/data/app-settings";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAppSettings();

  return (
    <div className="bg-background flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="group mb-6 flex items-center gap-2.5">
          <div className="bg-primary flex size-10 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105">
            <Layers className="size-6" />
          </div>
          <span className="text-text text-2xl font-bold tracking-tight">
            {settings.appName}
          </span>
        </Link>
      </div>

      <div className="px-4 sm:mx-auto sm:w-full sm:max-w-md sm:px-0">
        <div className="bg-card border-border rounded-2xl border px-6 py-8 shadow-xs sm:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
