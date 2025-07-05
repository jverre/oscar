import { Doc } from "../../convex/_generated/dataModel";

/**
 * Generate the proper file URL using /{org}/{team}/{filename} format
 * @param file - The file document
 * @param organization - The organization document (optional, will be fetched if not provided)
 * @param team - The team document (optional, will be fetched if not provided)
 * @returns URL string for the file
 */
export function buildFileUrl(
  file: Doc<"files">,
  organization?: { name: string },
  team?: { name: string }
): string {
  if (organization && team) {
    return `/${encodeURIComponent(organization.name)}/${encodeURIComponent(team.name)}/${encodeURIComponent(file.name)}`;
  }
  
  // Fallback for when org/team data is not available
  // This shouldn't happen with the new approach, but keeping for safety
  console.warn("buildFileUrl called without org/team data, falling back to file ID");
  return `/chat?file=${file._id}`;
}

