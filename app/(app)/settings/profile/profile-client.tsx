"use client";

import React, { useActionState, useState } from "react";
import { User, Mail, Camera, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProfileAction, type ProfileActionResponse } from "./actions";
import { OrgRole } from "@prisma/client";

interface ProfileClientProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    orgRole: OrgRole;
    organizationName?: string;
  };
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
];

export function ProfileClient({ user }: ProfileClientProps) {
  const [selectedImage, setSelectedImage] = useState<string>(user.image || "");
  const [name, setName] = useState<string>(user.name || "");
  const [email, setEmail] = useState<string>(user.email || "");
  const [showPresets, setShowPresets] = useState(false);

  const [state, formAction, isPending] = useActionState<
    ProfileActionResponse,
    FormData
  >(updateProfileAction, {});

  const getInitials = (text: string) => {
    if (!text) return "U";
    return text
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="border-border border-b pb-6">
        <h1 className="text-text text-2xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted mt-1 text-xs sm:text-sm">
          Manage your personal account profile, work email, and avatar photo.
        </p>
      </div>

      {/* Action Alerts */}
      {state.error && (
        <div className="border-danger/30 bg-danger/10 text-danger flex items-start gap-3 rounded-xl border p-4 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-xl border p-4 text-xs">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{state.success}</p>
        </div>
      )}

      {/* Main Form Card */}
      <div className="border-border bg-card rounded-2xl border p-6 sm:p-8 shadow-xs space-y-6">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="image" value={selectedImage} />

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-border/60">
            <div className="relative group">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={name || "Profile"}
                  className="size-20 rounded-full object-cover border-2 border-primary shadow-sm"
                />
              ) : (
                <div className="bg-primary flex size-20 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm">
                  {getInitials(name)}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change Photo"
              >
                <Camera className="size-6" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-text">Profile Photo</h3>
                <p className="text-xs text-muted">
                  Choose a preset avatar photo or use initials.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs gap-1.5"
                >
                  <Camera className="size-3.5" />
                  <span>Change photo</span>
                </Button>
                {selectedImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedImage("")}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove photo
                  </Button>
                )}
              </div>

              {showPresets && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-muted">Presets:</span>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <img
                      key={idx}
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      onClick={() => {
                        setSelectedImage(preset);
                        setShowPresets(false);
                      }}
                      className={`size-8 rounded-full cursor-pointer object-cover border-2 transition-transform hover:scale-110 ${
                        selectedImage === preset ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-4 pl-10 text-xs sm:text-sm focus:ring-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="text-text block text-xs font-semibold uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="text-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. maya@acme.com"
                  className="border-border bg-background text-text placeholder:text-muted focus:border-primary focus:ring-primary/20 h-10 w-full rounded-lg border pr-4 pl-10 text-xs sm:text-sm focus:ring-2 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Workspace Info Readout */}
          <div className="bg-background/80 border border-border/70 rounded-xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <Building2 className="size-4 text-primary" />
              <div>
                <span className="font-semibold text-text">{user.organizationName || "Your Workspace"}</span>
                <span className="text-muted block text-[11px]">Organization Role: {user.orgRole}</span>
              </div>
            </div>
            <span className="bg-primary/10 text-primary font-bold text-[10px] px-2 py-0.5 rounded">
              {user.orgRole}
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs px-6 h-9 shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  <span>Saving changes...</span>
                </>
              ) : (
                <span>Save changes</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
