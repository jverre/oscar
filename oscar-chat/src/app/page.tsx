import { headers } from "next/headers";
import { TenantAccessGuard } from "@/components/tenant/TenantAccessGuard";
import { AppLayout } from "@/components/layout/app-layout";
import { ContentRenderer } from "@/components/editor/ContentRenderer";

export default async function Home() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "";
  
  // Remove port number if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  // Check if we're on a subdomain
  const isDevelopment = hostWithoutPort.endsWith(".localtest.me") || hostWithoutPort.endsWith(".local");
  const isProduction = hostWithoutPort.endsWith(".com") || hostWithoutPort.endsWith(".app");
  
  let subdomain: string | null = null;
  
  if (isDevelopment && parts.length >= 3) {
    subdomain = parts[0];
  } else if (isProduction && parts.length >= 3) {
    subdomain = parts[0];
  }
  
  // Use TenantAccessGuard for both subdomain and base domain
  return (
    <TenantAccessGuard tenant={subdomain || ""}>
      <AppLayout>
        <ContentRenderer />
      </AppLayout>
    </TenantAccessGuard>
  );
}