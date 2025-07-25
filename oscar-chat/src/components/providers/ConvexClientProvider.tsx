"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        {children}
      </ConvexProvider>
    </SessionProvider>
  );
}