import { Doc } from "../../convex/_generated/dataModel";

/**
 * Generate the proper file URL using subdomain-based routing
 * @param file - The file document
 * @param organization - The organization document (optional, for subdomain-based routing)
 * @returns URL string for the file
 */
export function buildFileUrl(
  file: Doc<"files">,
  organization?: { subdomain?: string; name: string }
): string {
  // For subdomain-based routing, we just use the filename as the path
  // The subdomain routing is handled by middleware
  return `/${encodeURIComponent(file.name)}`;
}

