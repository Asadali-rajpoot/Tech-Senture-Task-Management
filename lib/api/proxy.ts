import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { OrgRole, TeamRole, User } from "@prisma/client";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Server Component Helper: Ensures user is logged in, redirects to /login if not.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/**
 * Server Component Helper: Ensures user is logged in AND has an active organization.
 */
export async function requireOrg() {
  const session = await requireAuth();
  if (!session.user.organizationId) {
    redirect("/onboarding");
  }
  return session as typeof session & {
    user: { organizationId: string; orgRole: OrgRole };
  };
}

/**
 * Server Action / API Guard: Ensures authenticated session.
 */
export async function withAuth<T>(
  fn: (ctx: { user: User; userId: string }) => Promise<T>
): Promise<T> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Authentication required");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new AuthError("User not found");
  }

  return fn({ user, userId: user.id });
}

/**
 * Server Action / API Guard: Enforces organization multi-tenancy scoping.
 * Resolves organizationId from the authenticated session, NEVER from client input.
 */
export async function withOrgScope<T>(
  fn: (ctx: { user: User; organizationId: string }) => Promise<T>
): Promise<T> {
  return withAuth(async ({ user }) => {
    if (!user.organizationId) {
      throw new ForbiddenError("User is not associated with an organization");
    }
    return fn({ user, organizationId: user.organizationId });
  });
}

/**
 * Server Action / API Guard: Enforces organization-level role checks (e.g. ORG_OWNER, ORG_ADMIN).
 */
export async function withRole<T>(
  roles: OrgRole[],
  fn: (ctx: { user: User; organizationId: string }) => Promise<T>
): Promise<T> {
  return withOrgScope(async ({ user, organizationId }) => {
    if (!roles.includes(user.orgRole)) {
      throw new ForbiddenError("Insufficient organization permissions");
    }
    return fn({ user, organizationId });
  });
}

/**
 * Server Action / API Guard: Enforces team-level role checks (OWNER, MEMBER).
 */
export async function withTeamRole<T>(
  teamId: string,
  roles: TeamRole[],
  fn: (ctx: {
    user: User;
    teamId: string;
    membership: { role: TeamRole };
  }) => Promise<T>
): Promise<T> {
  return withOrgScope(async ({ user, organizationId }) => {
    // Verify team belongs to user's organization
    const team = await db.team.findFirst({
      where: {
        id: teamId,
        project: { organizationId },
      },
    });

    if (!team) {
      throw new ForbiddenError("Team not found in this organization");
    }

    const membership = await db.membership.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId,
        },
      },
    });

    if (!membership || !roles.includes(membership.role)) {
      throw new ForbiddenError("Insufficient team permissions");
    }

    return fn({ user, teamId, membership });
  });
}
