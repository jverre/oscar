import { headers } from "next/headers";
import { TenantProvider } from "@/components/providers/TenantProvider";
import { TenantAccessGuard } from "@/components/tenant/TenantAccessGuard";
import { AppLayout } from "@/components/layout/app-layout";
import { ContentRenderer } from "@/components/editor/ContentRenderer";

export default async function Home() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "";
  
  // Remove port number if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  console.log('[PAGE] Hostname:', hostname);
  console.log('[PAGE] Host without port:', hostWithoutPort);
  console.log('[PAGE] Parts:', parts);
  
  // Check if we're on a subdomain
  const isDevelopment = hostWithoutPort.endsWith(".localtest.me") || hostWithoutPort.endsWith(".local");
  const isProduction = hostWithoutPort.endsWith(".com") || hostWithoutPort.endsWith(".app");
  const isVercelPreview = hostWithoutPort.endsWith(".vercel.app");
  
  let subdomain: string | null = "";
  
  if (isDevelopment && parts.length >= 3) {
    subdomain = parts[0];
  } else if (isProduction && parts.length >= 3) {
    subdomain = parts[0];
  } else if (isVercelPreview && parts.length >= 3) {
    subdomain = parts[0];
  }
  
  console.log('[PAGE] Extracted subdomain:', subdomain);
  
  // Wrap with TenantProvider first, then TenantAccessGuard
  return (
    <TenantProvider subdomain={subdomain}>
      <TenantAccessGuard>
        <AppLayout>
          <ContentRenderer />
        </AppLayout>
      </TenantAccessGuard>
    </TenantProvider>
  );
}