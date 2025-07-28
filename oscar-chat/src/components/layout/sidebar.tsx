"use client";

import React from "react";
import { FileTree } from "@/components/navigation/file-tree/FileTree";
import { PluginSection } from "@/components/navigation/plugins/PluginSection";
import { useTenant } from "@/components/providers/TenantProvider";

interface SidebarProps {
  onItemClick?: () => void;
}

export function Sidebar({ onItemClick }: SidebarProps) {
  const { organizationId, isAuthenticated, isLoading } = useTenant();

  return (
    <div className="border-r border-border h-full flex flex-col" onClick={onItemClick}>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {organizationId ? (
            <FileTree />
          ) : isLoading ? (
            <div className="text-sm text-muted-foreground">
              Loading files...
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No organization found
            </div>
          )}
        </div>
      </div>
      
      {/* Plugins section at the bottom - only show for authenticated users */}
      <div className="flex-shrink-0">
        {isAuthenticated && organizationId && (
          <PluginSection organizationId={organizationId} />
        )}
      </div>
    </div>
  );
}