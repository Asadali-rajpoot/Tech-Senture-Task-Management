import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { OrgRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId?: string | null;
      orgRole: OrgRole;
    } & DefaultSession["user"];
  }

  interface User {
    organizationId?: string | null;
    orgRole?: OrgRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          organizationId: user.organizationId,
          orgRole: user.orgRole,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.organizationId = user.organizationId;
        token.orgRole = user.orgRole;
      }

      if (trigger === "update" && session) {
        if (session.user?.organizationId !== undefined) {
          token.organizationId = session.user.organizationId;
        }
        if (session.user?.orgRole !== undefined) {
          token.orgRole = session.user.orgRole;
        }
      }

      // If token is missing organizationId, check database to see if user created/joined an organization
      if (token.id && !token.organizationId) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { organizationId: true, orgRole: true },
          });
          if (dbUser?.organizationId) {
            token.organizationId = dbUser.organizationId;
            token.orgRole = dbUser.orgRole;
          }
        } catch {
          // Ignore DB lookup error in JWT callback
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as
          string | null | undefined;
        session.user.orgRole = (token.orgRole as OrgRole) ?? OrgRole.ORG_MEMBER;
      }
      return session;
    },
  },
});
