"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/lib/validation/organization";
import { createWorkspaceAction } from "@/app/(auth)/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";

interface OnboardingFormProps {
  appName: string;
}

export function OnboardingForm({ appName }: OnboardingFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      teamSize: "Just me",
    },
  });

  const onSubmit = (data: CreateOrganizationInput) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name", data.name);
      if (data.teamSize) {
        formData.append("teamSize", data.teamSize);
      }

      const result = await createWorkspaceAction(undefined, formData);
      if (result?.error) {
        setServerError(result.error);
      }
    });
  };

  return (
    <>
      {/* Top-right "Back to app" navigation link outside card */}
      <div className="absolute top-6 right-6 z-10 sm:top-8 sm:right-8">
        <Link
          href="/dashboard"
          className="text-text hover:text-primary inline-flex items-center gap-1 text-xs font-semibold transition-colors"
        >
          <span>Back to app</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

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

        {/* Step Indicator, Heading & Subtext */}
        <div className="space-y-1">
          <span className="text-primary text-xs font-bold uppercase tracking-wider block">
            STEP 2 OF 2
          </span>
          <h1 className="text-text text-2xl font-bold tracking-tight">
            Create your workspace
          </h1>
          <p className="text-muted text-xs">
            This is where your team&apos;s projects and tasks will live.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="text-text block text-xs font-medium"
            >
              Workspace name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Acme Inc"
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
              htmlFor="teamSize"
              className="text-text block text-xs font-medium"
            >
              Team size
            </label>
            <Controller
              name="teamSize"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <SelectTrigger id="teamSize" className="w-full">
                    <SelectValue placeholder="Just me" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Just me">Just me</SelectItem>
                    <SelectItem value="2-10">2-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="50+">50+</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg w-full h-10 mt-2 text-sm shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                <span>Creating workspace...</span>
              </>
            ) : (
              <span>Create workspace</span>
            )}
          </Button>
        </form>
      </Card>
    </>
  );
}
