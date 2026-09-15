"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

interface LoginFormProps {
  appName: string;
}

export function LoginForm({ appName }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginInput) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      const result = await loginAction(undefined, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-md p-8 sm:p-10 bg-card border-border shadow-md rounded-2xl space-y-6">
      {/* Brand Header */}
      <div className="flex items-center justify-start">
        <div className="flex items-center gap-2.5">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/icon.png"
              alt={appName}
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span className="text-text text-xl font-bold tracking-tight">
            {appName || "PROXima"}
          </span>
        </div>
      </div>

      {/* Heading & Subtext */}
      <div className="space-y-1">
        <h1 className="text-text text-2xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted text-xs">
          Sign in to continue to your workspace.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-text block text-xs font-medium"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isPending}
            className={errors.email ? "border-danger focus:ring-danger/20" : ""}
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-danger text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-text block text-xs font-medium"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            disabled={isPending}
            className={errors.password ? "border-danger focus:ring-danger/20" : ""}
            {...register("password")}
          />
          {errors.password?.message && (
            <p className="text-danger text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg w-full h-10 mt-2 text-sm shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </Button>
      </form>

      {/* Footer Helper Link */}
      <div className="pt-2 text-center">
        <p className="text-muted text-xs">
          No account yet?{" "}
          <Link
            href="/signup"
            className="text-primary font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </Card>
  );
}
