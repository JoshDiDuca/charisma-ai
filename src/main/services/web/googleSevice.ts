interface GoogleSearchResult {
  title: string;
  link: string;
  description: string;
}

import { search, OrganicResult, ResultTypes } from "google-sr";
import { WebSearch } from "shared/types/Sources/WebSearch";

export async function searchGoogle(query: string) {
  try {
    const results = await search({
      query,
      resultTypes: [OrganicResult],
      requestConfig: {
        params: {
          safe: "active"
        },
      },
    });

    return (results as GoogleSearchResult[]).map((result) => ({
      title: result.title,
      url: result.link,
      description: result.description,
    } as WebSearch));
  } catch (error) {
    console.error("Error searching with google-sr:", error);
    return [];
  }
}

