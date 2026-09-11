"use server";

import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function acceptInvitationAction(token: string) {
  const session = await auth();
  const invite = await db.invitation.findUnique({
    where: { token },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return { error: "This invitation link is invalid or has expired." };
  }

  if (!session?.user?.id) {
    // User needs to be authenticated or sign up
    redirect(`/signup?inviteToken=${token}`);
  }

  // Associate user with organization
  await db.user.update({
    where: { id: session.user.id },
    data: {
      organizationId: invite.organizationId,
      orgRole: invite.role,
    },
  });

  // Delete consumed invitation
  await db.invitation.delete({
    where: { id: invite.id },
  });

  redirect("/dashboard");
}

export async function signupWithInviteAction(
  token: string,
  _prevState: unknown,
  formData: FormData
) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password || password.length < 6) {
    return {
      error: "Please provide all required details (password min 6 characters).",
    };
  }

  const invite = await db.invitation.findUnique({
    where: { token },
  });

  if (!invite || invite.expiresAt < new Date()) {
    return { error: "This invitation is invalid or has expired." };
  }

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return {
      error: "An account with this email already exists. Please log in.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user directly linked to invited organization
  await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      organizationId: invite.organizationId,
      orgRole: invite.role,
    },
  });

  // Delete consumed invitation
  await db.invitation.delete({
    where: { id: invite.id },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // Re-throw redirect
    throw error;
  }
}
