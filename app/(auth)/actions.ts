"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export async function loginAction(_prevState: unknown, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = loginSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return {
            error: "An error occurred during sign in. Please try again.",
          };
      }
    }
    // Re-throw redirect error which Next.js uses for server-side navigation
    throw error;
  }
}

export async function signupAction(_prevState: unknown, formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const parsed = signupSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Invalid input",
    };
  }

  const { name, email, password } = parsed.data;

  try {
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists.",
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to automatically sign in after registration." };
    }
    // Re-throw Next.js redirect
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
