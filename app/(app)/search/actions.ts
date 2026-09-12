"use server";

import { withOrgScope } from "@/lib/api/proxy";
import { searchOrganization, type GlobalSearchResults } from "@/lib/data/search";

export interface SearchActionResponse {
  results?: GlobalSearchResults;
  error?: string;
}

export async function globalSearchAction(
  query: string
): Promise<SearchActionResponse> {
  try {
    return await withOrgScope(async ({ organizationId }) => {
      if (!query || query.trim().length === 0) {
        return {
          results: { tasks: [], projects: [], teams: [], totalMatches: 0 },
        };
      }

      const results = await searchOrganization(organizationId, query);
      return { results };
    });
  } catch (error) {
    console.error("[globalSearchAction error]", error);
    return { error: "Failed to perform global search" };
  }
}
