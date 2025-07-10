import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";

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
  
  // If we have a subdomain, show the org page
  if (subdomain) {
    const session = await auth();
    
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to {subdomain}
          </h2>
          <p className="text-muted-foreground mb-2">
            Select or create a file to get started
          </p>
          {session?.user?.email && (
            <p className="text-xs text-muted-foreground">
              Logged in as: {session.user.email}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // No subdomain - redirect to auth
  redirect("/auth/signin");
}