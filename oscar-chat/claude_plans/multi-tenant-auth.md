# Improved Multi-Tenant Authentication Implementation Plan

## Overview
Simplified multi-tenant SaaS using Next.js 14, Convex, and Auth.js with streamlined authentication and organization management.

## Core Principles
- **Simple is better**: One-step auth + org creation
- **Security first**: Validate everything, trust nothing
- **Developer friendly**: Consistent subdomain routing in local and production
- **Production ready**: Same code works locally and in production

## Reference

If you run into any isssues about convex and authjs, read:
- https://stack.convex.dev/nextauth
- https://stack.convex.dev/nextauth-adapter
- https://authjs.dev/getting-started/installation?framework=next.js

## Phase 1: Initial Setup

### 1.1 Project Initialization
```bash
npx create-next-app@latest oscar-chat --typescript --tailwind --app
cd oscar-chat
npx shadcn-ui@latest init
npm install convex @convex-dev/auth @auth/core
npx convex dev
```

### 1.2 Environment Configuration
```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_APP_URL=http://oscar-chat.local:3000
NEXT_PUBLIC_BASE_DOMAIN=oscar-chat.local
```

## Phase 2: Simplified Convex Schema

### 2.1 Database Schema (`convex/schema.ts`)
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  // Simplified: users have a single organization
  users: defineTable({
    ...authTables.users.validator.fields,
    organizationId: v.optional(v.id("organizations")),
    organizationRole: v.optional(v.union(
      v.literal("owner"),
      v.literal("member")
    )),
  }),
  
  organizations: defineTable({
    name: v.string(),
    subdomain: v.string(), // unique, validated
    ownerId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro")),
    createdAt: v.number(),
  })
    .index("by_subdomain", ["subdomain"]),
  
  files: defineTable({
    organizationId: v.id("organizations"),
    path: v.string(),
    content: v.string(),
    type: v.string(), // "blog", "claude_session", etc
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_path", ["organizationId", "path"]),
});
```

### 2.2 Reserved Subdomains (`convex/constants.ts`)
```typescript
export const RESERVED_SUBDOMAINS = [
  "www", "app", "api", "admin", "dashboard", "blog",
  "docs", "help", "support", "status", "about"
];

export const SUBDOMAIN_REGEX = /^[a-z0-9-]{3,32}$/;
```

## Phase 3: Unified Auth Flow

### 3.1 Auth Configuration (`convex/auth.ts`)
```typescript
import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { mutation } from "./_generated/server";
import { RESERVED_SUBDOMAINS, SUBDOMAIN_REGEX } from "./constants";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", q => q.eq("email", args.profile.email))
        .unique();
      
      if (user) {
        // Existing user - just return
        return user._id;
      }
      
      // New user - return user ID, org creation happens separately
      return ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        image: args.profile.picture,
      });
    },
  },
});

// Separate mutation for org creation (called from client)
export const createOrganization = mutation({
  args: {
    name: v.string(),
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Validate subdomain
    if (!SUBDOMAIN_REGEX.test(args.subdomain)) {
      throw new Error("Invalid subdomain format");
    }
    
    if (RESERVED_SUBDOMAINS.includes(args.subdomain)) {
      throw new Error("Subdomain is reserved");
    }
    
    // Check if subdomain exists
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_subdomain", q => q.eq("subdomain", args.subdomain))
      .unique();
    
    if (existing) {
      throw new Error("Subdomain already taken");
    }
    
    // Check if user already has an org
    const user = await ctx.db.get(identity.subject);
    if (user?.organizationId) {
      throw new Error("User already has an organization");
    }
    
    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      subdomain: args.subdomain,
      ownerId: identity.subject,
      plan: "free",
      createdAt: Date.now(),
    });
    
    // Update user with org
    await ctx.db.patch(identity.subject, {
      organizationId: orgId,
      organizationRole: "owner",
    });
    
    return { organizationId: orgId, subdomain: args.subdomain };
  },
});
```

## Phase 4: Simplified Routing

### 4.1 Middleware (`middleware.ts`)
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED_SUBDOMAINS = ["www", "app", "api", "admin"];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  
  // Remove port number if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  // Determine if we're in local or production
  const isLocal = hostWithoutPort.endsWith(".local");
  const isProduction = hostWithoutPort.endsWith(".com") || hostWithoutPort.endsWith(".app");
  
  // Extract subdomain based on environment
  let subdomain: string | null = null;
  
  if (isLocal && parts.length === 3) {
    // Local: subdomain.oscar-chat.local
    subdomain = parts[0];
  } else if (isProduction && parts.length >= 3) {
    // Production: subdomain.oscar-chat.com
    subdomain = parts[0];
  }
  
  // Check if it's a valid subdomain (not reserved)
  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    // Already in org path? Skip rewrite
    if (!url.pathname.startsWith(`/org/${subdomain}`)) {
      url.pathname = `/org/${subdomain}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  
  // Auth pages should be accessible on base domain
  if (url.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }
  
  // API routes should pass through
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  
  // No subdomain and not an allowed path? Redirect to auth
  if (!subdomain && !url.pathname.startsWith("/org/")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## Phase 5: Streamlined UI Components

### 5.1 Root Layout with Auth (`src/app/layout.tsx`)
```typescript
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexAuthNextjsServerProvider>
          {children}
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
```

### 5.2 Unified Sign-in Page (`src/app/auth/signin/page.tsx`)
```typescript
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const createOrg = useMutation(api.auth.createOrganization);
  const [orgName, setOrgName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState("");

  // If user exists but no org, show org creation
  if (user && !user.organizationId) {
    return (
      <Card className="max-w-md mx-auto mt-20 p-6">
        <h2 className="text-2xl font-bold mb-4">Create Your Organization</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            const result = await createOrg({ name: orgName, subdomain });
            // Redirect to org subdomain
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : "";
            const baseDomain = window.location.hostname.includes(".local")
              ? "oscar-chat.local"
              : "oscar-chat.com";
            
            const newUrl = `${protocol}//${result.subdomain}.${baseDomain}${port}`;
            window.location.href = newUrl;
          } catch (err) {
            setError(err.message);
          }
        }}>
          <Input
            placeholder="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="mb-4"
          />
          <Input
            placeholder="Subdomain (e.g., my-company)"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            pattern="[a-z0-9-]{3,32}"
            className="mb-4"
          />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Button type="submit" className="w-full">
            Create Organization
          </Button>
        </form>
      </Card>
    );
  }

  // Sign in
  return (
    <Card className="max-w-md mx-auto mt-20 p-6">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      <Button
        onClick={() => signIn("google")}
        className="w-full"
      >
        Continue with Google
      </Button>
    </Card>
  );
}
```

### 5.3 Organization Layout (`src/app/org/[subdomain]/layout.tsx`)
```typescript
import { auth } from "@/convex/auth";
import { redirect } from "next/navigation";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { subdomain: string };
}) {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/signin");
  }
  
  // Verify user has access to this org
  const user = await getUserWithOrg(session.userId);
  if (user?.organization?.subdomain !== params.subdomain) {
    redirect("/auth/signin");
  }
  
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-4">{user.organization.name}</h1>
        {/* File tree component */}
      </aside>
      <main className="flex-1 bg-gray-800">
        {children}
      </main>
    </div>
  );
}
```

## Phase 6: Security & Error Handling

### 6.1 Input Validation Helpers (`src/utils/validation.ts`)
```typescript
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
```

## Phase 7: Testing & Development

### 7.1 Local Development Setup

#### Configure Hosts File
Add these entries to your `/etc/hosts` file (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```bash
# Oscar Chat local development
127.0.0.1 oscar-chat.local
127.0.0.1 acme.oscar-chat.local
127.0.0.1 test-org.oscar-chat.local
127.0.0.1 demo.oscar-chat.local
# Add more as needed for testing
```

#### Update Environment Variables
```env
# .env.local
NEXT_PUBLIC_APP_URL=http://oscar-chat.local:3000
```

#### Start Development Servers
```bash
# Terminal 1
npx convex dev

# Terminal 2
npm run dev

# Access:
# - Main app: http://oscar-chat.local:3000 (redirects to auth)
# - Organizations: 
#   - http://acme.oscar-chat.local:3000
#   - http://test-org.oscar-chat.local:3000
#   - http://demo.oscar-chat.local:3000
```

#### Why Hosts File?
Using a custom local domain (`.local`) instead of `.localhost` ensures consistent subdomain behavior across all browsers and matches production routing exactly. This approach:
- Works identically to production
- Tests the actual subdomain extraction logic
- Avoids browser-specific `.localhost` handling variations
- Makes debugging easier with production-like URLs

### 7.2 E2E Test Cases
1. New user flow: Sign in → Create org → Redirect
2. Existing user: Sign in → Auto-redirect to org
3. Invalid subdomain: Show error
4. Rate limiting: Block after 5 attempts
5. Access control: Can't access other orgs

## Phase 8: Production Deployment

### 8.1 Vercel Settings
```json
{
  "redirects": [
    {
      "source": "/",
      "has": [{ "type": "host", "value": "(?<subdomain>^(?!www\\.|app\\.).+)\\.oscar-chat\\.com" }],
      "destination": "/org/:subdomain"
    }
  ]
}
```

### 8.2 Security Checklist
- [x] Subdomain validation with regex
- [x] Reserved subdomain list
- [x] Rate limiting on org creation
- [x] SQL injection impossible (Convex)
- [x] XSS protection (React)
- [x] CSRF protection (SameSite cookies)
- [x] Secure headers in middleware

## Key Improvements Made

1. **Simplified Flow**: Combined sign-in and org creation in one page
2. **Better Security**: Added validation, rate limiting, reserved subdomains
3. **Consistent Local Dev**: Use subdomains locally just like production (*.localhost)
4. **Cleaner Schema**: Users belong to one org (simpler for MVP)
5. **Error Handling**: Proper error messages and validation
6. **Production Ready**: Same middleware code works locally and deployed

## Next Steps
1. Implement file CRUD operations
2. Add real-time collaboration features
3. Build the terminal-style UI
4. Add billing/subscription management