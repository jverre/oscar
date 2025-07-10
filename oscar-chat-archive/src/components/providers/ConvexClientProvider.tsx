"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { Session } from "next-auth";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ 
  children, 
  session 
}: { 
  children: ReactNode;
  session: Session | null;
}) {

  // Configure Convex auth with NextAuth session
  if (session?.user?.id) {
    convex.setAuth(async () => {
      // Return a JWT token that identifies the user to Convex
      return session.user.id;
    });
  } else {
    convex.clearAuth();
  }

  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}