"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signupAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface SignupFormProps {
  appName: string;
}

export function SignupForm({ appName }: SignupFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignupInput) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email);
      formData.append("password", data.password);

      const result = await signupAction(undefined, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-md p-8 sm:p-10 bg-card border-border shadow-md rounded-2xl space-y-6">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5">
        <div className="bg-primary flex size-7 items-center justify-center rounded-lg text-white shadow-xs">
          <Check className="size-4 stroke-[2.5]" />
        </div>
        <span className="text-text text-base font-bold tracking-tight">
          {appName}
        </span>
      </div>

      {/* Heading & Subtext */}
      <div className="space-y-1">
        <h1 className="text-text text-2xl font-bold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted text-xs">
          Step 1 of 2 — your workspace comes next.
        </p>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-text block text-xs font-medium"
          >
            Full name
          </label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Maya Patel"
            disabled={isPending}
            className={errors.name ? "border-danger focus:ring-danger/20" : ""}
            {...register("name")}
          />
          {errors.name?.message && (
            <p className="text-danger text-xs mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-text block text-xs font-medium"
          >
            Work email
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
              <span>Creating account...</span>
            </>
          ) : (
            <span>Create account</span>
          )}
        </Button>
      </form>

      {/* Footer Helper Link */}
      <div className="pt-2 text-center">
        <p className="text-muted text-xs">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </Card>
  );
}
