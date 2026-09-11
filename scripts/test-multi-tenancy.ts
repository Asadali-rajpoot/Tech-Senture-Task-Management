import { getOrgProjects, getProjectById } from "../lib/data/projects";
import { getOrgTeams, getTeamById, getOrgMembersForTeamSelect } from "../lib/data/teams";
import { getOrgMembers } from "../lib/data/members";
import { getOrganization } from "../lib/data/organization";
import { db } from "../lib/db";

async function runMultiTenancyTests() {
  console.log("=================================================");
  console.log("Running Multi-Tenancy & Data Isolation Test Suite");
  console.log("=================================================");

  // 1. Fetch Tenant A (Acme Corp) and Tenant B (Globex Corp)
  const orgA = await db.organization.findFirst({ where: { slug: "acme-corp" } });
  const orgB = await db.organization.findFirst({ where: { slug: "globex-corp" } });

  if (!orgA || !orgB) {
    console.error("❌ Both test organizations must exist. Run seed script first.");
    process.exit(1);
  }

  console.log(`✓ Tenant A: "${orgA.name}" (ID: ${orgA.id})`);
  console.log(`✓ Tenant B: "${orgB.name}" (ID: ${orgB.id})`);

  let failures = 0;

  // -------------------------------------------------------------
  // Test 1: Project List Isolation
  // -------------------------------------------------------------
  const projectsOrgA = await getOrgProjects(orgA.id);
  const leakedToA = projectsOrgA.filter((p) => p.organizationId !== orgA.id);
  if (leakedToA.length === 0 && projectsOrgA.length > 0) {
    console.log("✅ [PASS] Test 1: getOrgProjects(OrgA) only returns Org A projects.");
  } else {
    console.error("❌ [FAIL] Test 1: Cross-tenant project leakage detected in getOrgProjects!");
    failures++;
  }

  // -------------------------------------------------------------
  // Test 2: Project Direct ID Access Isolation (404/Null Guard)
  // -------------------------------------------------------------
  const projectsOrgB = await getOrgProjects(orgB.id);
  const projectBId = projectsOrgB[0]?.id;

  if (projectBId) {
    const crossAccessProject = await getProjectById(orgA.id, projectBId);
    if (crossAccessProject === null) {
      console.log("✅ [PASS] Test 2: getProjectById(OrgA, ProjectB_ID) strictly returns null (guarded 404).");
    } else {
      console.error("❌ [FAIL] Test 2: Tenant A was able to read Tenant B project via direct ID!");
      failures++;
    }
  }

  // -------------------------------------------------------------
  // Test 3: Team List Isolation
  // -------------------------------------------------------------
  const teamsOrgA = await getOrgTeams(orgA.id);
  const leakedTeamsToA = teamsOrgA.filter((t) => t.project.isArchived === undefined); // verify proper query structure
  const crossOrgTeams = await db.team.findMany({
    where: {
      id: { in: teamsOrgA.map((t) => t.id) },
      project: { organizationId: orgB.id },
    },
  });

  if (crossOrgTeams.length === 0 && teamsOrgA.length > 0) {
    console.log("✅ [PASS] Test 3: getOrgTeams(OrgA) only returns teams belonging to Org A projects.");
  } else {
    console.error("❌ [FAIL] Test 3: Cross-tenant team leakage detected in getOrgTeams!");
    failures++;
  }

  // -------------------------------------------------------------
  // Test 4: Team Direct ID Access Isolation (404/Null Guard)
  // -------------------------------------------------------------
  const teamsOrgB = await getOrgTeams(orgB.id);
  const teamBId = teamsOrgB[0]?.id;

  if (teamBId) {
    const crossAccessTeam = await getTeamById(orgA.id, teamBId);
    if (crossAccessTeam === null) {
      console.log("✅ [PASS] Test 4: getTeamById(OrgA, TeamB_ID) strictly returns null (guarded 404).");
    } else {
      console.error("❌ [FAIL] Test 4: Tenant A was able to read Tenant B team via direct ID!");
      failures++;
    }
  }

  // -------------------------------------------------------------
  // Test 5: Member List Isolation
  // -------------------------------------------------------------
  const membersOrgA = await getOrgMembers(orgA.id);
  const membersOrgB = await getOrgMembers(orgB.id);

  const crossMembers = membersOrgA.filter((mA) =>
    membersOrgB.some((mB) => mB.id === mA.id)
  );

  if (crossMembers.length === 0 && membersOrgA.length > 0 && membersOrgB.length > 0) {
    console.log("✅ [PASS] Test 5: getOrgMembers strictly isolates users between Org A and Org B.");
  } else {
    console.error("❌ [FAIL] Test 5: User overlap or cross-tenant leakage in member lists!");
    failures++;
  }

  // -------------------------------------------------------------
  // Test 6: Team Selectable Members Isolation
  // -------------------------------------------------------------
  const availableMembersOrgA = await getOrgMembersForTeamSelect(orgA.id);
  const crossAvailable = availableMembersOrgA.filter((mA) =>
    membersOrgB.some((mB) => mB.id === mA.id)
  );

  if (crossAvailable.length === 0) {
    console.log("✅ [PASS] Test 6: getOrgMembersForTeamSelect(OrgA) never exposes Org B users.");
  } else {
    console.error("❌ [FAIL] Test 6: Org B users exposed to Org A team selector!");
    failures++;
  }

  // -------------------------------------------------------------
  // Test 7: Organization Metadata Scoping
  // -------------------------------------------------------------
  const orgAMeta = await getOrganization(orgA.id);
  if (orgAMeta?.id === orgA.id && orgAMeta?.name === orgA.name) {
    console.log("✅ [PASS] Test 7: getOrganization accurately returns scoped tenant record.");
  } else {
    console.error("❌ [FAIL] Test 7: Organization query mismatch!");
    failures++;
  }

  console.log("=================================================");
  if (failures === 0) {
    console.log("🎉 ALL MULTI-TENANCY DATA ISOLATION TESTS PASSED (7/7)!");
    console.log("=================================================");
    process.exit(0);
  } else {
    console.error(`💥 ${failures} TEST(S) FAILED. Data isolation violated.`);
    console.log("=================================================");
    process.exit(1);
  }
}

runMultiTenancyTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
