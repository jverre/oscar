export function validateSubdomain(subdomain: string): string | null {
  if (!subdomain) return "Subdomain is required";
  if (subdomain.length < 3) return "Subdomain too short";
  if (subdomain.length > 32) return "Subdomain too long";
  if (!/^[a-z0-9-]+$/.test(subdomain)) return "Invalid characters";
  if (subdomain.startsWith("-") || subdomain.endsWith("-")) {
    return "Cannot start or end with hyphen";
  }
  return null;
}