import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative">
      {children}
    </div>
  );
}
