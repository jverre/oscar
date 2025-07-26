"use client";

import React from "react";
import { FileTree } from "@/components/navigation/file-tree/FileTree";
import { PluginSection } from "@/components/navigation/plugins/PluginSection";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const { data: session } = useSession();
  
  // Get user's organization info
  const user = useQuery(
    api.users.currentUser,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Debug logging
  React.useEffect(() => {
    console.log("Sidebar user data:", user);
    if (user && "organizationId" in user) {
      console.log("Sidebar organizationId:", user.organizationId);
    }
  }, [user]);
  
  return (
    <div className="border-r border-border h-full flex flex-col" onClick={onItemClick}>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {user && "organizationId" in user && user.organizationId ? (
            <FileTree organizationId={user.organizationId} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Loading files...
            </div>
          )}
        </div>
      </div>
      
      {/* Plugins section at the bottom */}
      <div className="flex-shrink-0">
        {user && "organizationId" in user && user.organizationId && (
          <PluginSection organizationId={user.organizationId} />
        )}
      </div>
    </div>
  );
}