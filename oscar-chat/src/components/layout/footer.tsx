"use client";

import { useSession } from "next-auth/react";

export function Footer() {
  const { data: session } = useSession();

  return (
    <footer className="border-t border-border h-[22px] flex items-center justify-between px-3">
      <div className="flex items-center">
      </div>
      <div className="flex items-center">
        {session?.user?.email && (
          <span className="text-xs text-muted-foreground">
            {session.user.email}
          </span>
        )}
      </div>
    </footer>
  );
}