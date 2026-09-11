import React from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getInvitationByToken } from "@/lib/data/members";
import { InviteClient } from "./invite-client";
import { Button } from "@/components/ui/button";
import { Building2, Shield } from "lucide-react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const invite = await getInvitationByToken(token);

  if (!invite || invite.expiresAt < new Date()) {
    return (
      <div className="space-y-4 py-8 text-center">
        <div className="bg-danger/10 text-danger mx-auto flex size-12 items-center justify-center rounded-full">
          <Shield className="size-6" />
        </div>
        <h1 className="text-text text-xl font-bold">
          Invitation Expired or Invalid
        </h1>
        <p className="text-muted mx-auto max-w-sm text-xs">
          This invitation link is no longer valid. Please ask an organization
          admin to send you a new invite.
        </p>
        <Link href="/login">
          <Button size="sm" variant="outline">
            Return to Sign in
          </Button>
        </Link>
      </div>
    );
  }

  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Invite Header */}
      <div className="space-y-2 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl font-bold shadow-xs">
          <Building2 className="size-6" />
        </div>
        <h1 className="text-text text-xl font-bold tracking-tight">
          Join {invite.organization.name}
        </h1>
        <p className="text-muted text-xs leading-relaxed">
          <strong>{invite.inviter.name || invite.inviter.email}</strong> has
          invited you to join the <strong>{invite.organization.name}</strong>{" "}
          workspace as an <strong>{invite.role}</strong>.
        </p>
      </div>

      <InviteClient
        token={token}
        email={invite.email}
        isLoggedIn={Boolean(session?.user)}
        currentUserEmail={session?.user?.email}
      />
    </div>
  );
}
