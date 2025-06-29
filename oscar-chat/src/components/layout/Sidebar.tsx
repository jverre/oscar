"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FileList } from "../chat/FileList";
import { SidebarTimeline } from "../timeline/SidebarTimeline";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [isChatsExpanded, setIsChatsExpanded] = useState(true);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [isCapabilitiesExpanded, setIsCapabilitiesExpanded] = useState(false);
  const [shouldCreateFile, setShouldCreateFile] = useState(false);
  

  const files = useQuery(api.files.list);
  
  const handleCreateFile = async () => {
    setShouldCreateFile(true);
  };

  const handleSidebarClick = (e: React.MouseEvent) => {
    // Only clear selection if clicking on the sidebar background itself (not on file items)
    if (e.target === e.currentTarget) {
      // Force any FileList components to clear their selections
      document.dispatchEvent(new CustomEvent('clearFileSelection'));
    }
  };

  return (
    <aside 
      className="w-64 bg-sidebar border-r flex flex-col h-full flex-shrink-0" 
      style={{ borderRightColor: 'var(--border-subtle)', borderRightWidth: '1px' }}
      onClick={handleSidebarClick}
    >
      {/* Chats Section - Takes remaining space when expanded */}
      <div className={cn(
        "flex flex-col",
        isChatsExpanded ? "flex-1 min-h-0" : "flex-none"
      )}>
        <div className="flex !h-[32px] items-center justify-between px-3 border-b group flex-shrink-0" style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}>
          <button
            onClick={() => setIsChatsExpanded(!isChatsExpanded)}
            className="flex items-center gap-2 text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
          >
            {isChatsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Files
          </button>
          {isChatsExpanded && (
            <div className="flex gap-1">
              <button
                onClick={handleCreateFile}
                className="p-1 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="New File"
              >
                <Plus className="h-3 w-3 text-sidebar-foreground" />
              </button>
            </div>
          )}
        </div>
        
        {isChatsExpanded && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex-1 overflow-y-auto">
              <FileList
                files={files}
                shouldCreateFile={shouldCreateFile}
                onFileCreated={() => setShouldCreateFile(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeline Section - Fixed at bottom */}
      <div className="flex-shrink-0 border-t" style={{ borderTopColor: 'var(--border-subtle)', borderTopWidth: '1px' }}>
        <button
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {isTimelineExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Timeline
        </button>
        
        {isTimelineExpanded && (
          <SidebarTimeline />
        )}
      </div>

      {/* Capabilities Section - Fixed at bottom */}
      <div className="flex-shrink-0 border-t" style={{ borderTopColor: 'var(--border-subtle)', borderTopWidth: '1px' }}>
        <button
          onClick={() => setIsCapabilitiesExpanded(!isCapabilitiesExpanded)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {isCapabilitiesExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Capabilities
        </button>
        
        {isCapabilitiesExpanded && (
          <div className="px-3 py-2 text-sm text-muted-foreground max-h-32 overflow-y-auto">
            Coming soon
          </div>
        )}
      </div>
    </aside>
  );
}