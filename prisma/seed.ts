import {
  PrismaClient,
  OrgRole,
  TeamRole,
  TaskStatus,
  TaskPriority,
  ProjectDomain,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with multi-tenant data...");

  // 1. AppSettings
  await prisma.appSettings.upsert({
    where: { id: "default-settings" },
    update: { appName: "PROXima" },
    create: {
      id: "default-settings",
      appName: "PROXima",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  // =========================================================================
  // TENANT A: Acme Corp
  // =========================================================================
  const orgA = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corp",
      slug: "acme-corp",
    },
  });

  const maya = await prisma.user.upsert({
    where: { email: "maya@acme.com" },
    update: {
      organizationId: orgA.id,
      orgRole: OrgRole.ORG_OWNER,
    },
    create: {
      name: "Maya Lin",
      email: "maya@acme.com",
      passwordHash,
      orgRole: OrgRole.ORG_OWNER,
      organizationId: orgA.id,
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: "alex@acme.com" },
    update: {
      organizationId: orgA.id,
      orgRole: OrgRole.ORG_MEMBER,
    },
    create: {
      name: "Alex Rivera",
      email: "alex@acme.com",
      passwordHash,
      orgRole: OrgRole.ORG_MEMBER,
      organizationId: orgA.id,
    },
  });

  let projectA = await prisma.project.findFirst({
    where: { organizationId: orgA.id, name: "Core Platform Redesign" },
  });
  if (!projectA) {
    projectA = await prisma.project.create({
      data: {
        name: "Core Platform Redesign",
        description: "Next-generation task management interface and data isolation",
        domain: ProjectDomain.DEVELOPMENT,
        organizationId: orgA.id,
      },
    });
  }

  let teamA = await prisma.team.findFirst({
    where: { projectId: projectA.id, name: "Frontend Engineering" },
  });
  if (!teamA) {
    teamA = await prisma.team.create({
      data: {
        name: "Frontend Engineering",
        description: "UI/UX and frontend architecture team",
        projectId: projectA.id,
        creatorId: maya.id,
        memberships: {
          create: [
            { userId: maya.id, role: TeamRole.OWNER },
            { userId: alex.id, role: TeamRole.MEMBER },
          ],
        },
        labels: {
          create: [
            { name: "Feature", color: "#6366F1" },
            { name: "Bug", color: "#EF4444" },
            { name: "Design", color: "#8B5CF6" },
          ],
        },
      },
    });
  }

  // =========================================================================
  // TENANT B: Globex Corporation (For Cross-Tenant Isolation Verification)
  // =========================================================================
  const orgB = await prisma.organization.upsert({
    where: { slug: "globex-corp" },
    update: {},
    create: {
      name: "Globex Corporation",
      slug: "globex-corp",
    },
  });

  const hank = await prisma.user.upsert({
    where: { email: "hank@globex.com" },
    update: {
      organizationId: orgB.id,
      orgRole: OrgRole.ORG_OWNER,
    },
    create: {
      name: "Hank Scorpio",
      email: "hank@globex.com",
      passwordHash,
      orgRole: OrgRole.ORG_OWNER,
      organizationId: orgB.id,
    },
  });

  const homer = await prisma.user.upsert({
    where: { email: "homer@globex.com" },
    update: {
      organizationId: orgB.id,
      orgRole: OrgRole.ORG_MEMBER,
    },
    create: {
      name: "Homer Simpson",
      email: "homer@globex.com",
      passwordHash,
      orgRole: OrgRole.ORG_MEMBER,
      organizationId: orgB.id,
    },
  });

  let projectB = await prisma.project.findFirst({
    where: { organizationId: orgB.id, name: "Project Arcturus" },
  });
  if (!projectB) {
    projectB = await prisma.project.create({
      data: {
        name: "Project Arcturus",
        description: "Top secret international strategic initiative for Globex",
        domain: ProjectDomain.OPERATIONS,
        organizationId: orgB.id,
      },
    });
  }

  let teamB = await prisma.team.findFirst({
    where: { projectId: projectB.id, name: "Special Projects Group" },
  });
  if (!teamB) {
    teamB = await prisma.team.create({
      data: {
        name: "Special Projects Group",
        description: "Volcano lair operations and thermal development",
        projectId: projectB.id,
        creatorId: hank.id,
        memberships: {
          create: [
            { userId: hank.id, role: TeamRole.OWNER },
            { userId: homer.id, role: TeamRole.MEMBER },
          ],
        },
        labels: {
          create: [
            { name: "Top Secret", color: "#EF4444" },
            { name: "Infrastructure", color: "#F59E0B" },
          ],
        },
      },
    });
  }

  console.log("Database seeded successfully with Tenant A (Acme Corp) and Tenant B (Globex Corporation)!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
