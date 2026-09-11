import { db } from "@/lib/db";

export async function getOrganization(organizationId: string) {
  return db.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
        },
      },
    },
  });
}
