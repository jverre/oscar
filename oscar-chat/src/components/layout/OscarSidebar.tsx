"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FileList } from "../chat/FileList";
import { 
  Sidebar, 
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function OscarSidebar() {
  const isMobile = useIsMobile();
  const [isChatsExpanded, setIsChatsExpanded] = useState(true);
  const [isCapabilitiesExpanded, setIsCapabilitiesExpanded] = useState(false);
  const [shouldCreateFile, setShouldCreateFile] = useState(false);
  
  const files = useQuery(api.files.list);
  
  const handleCreateFile = async () => {
    setShouldCreateFile(true);
  };

  const handleSidebarClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      document.dispatchEvent(new CustomEvent('clearFileSelection'));
    }
  };

  return (
    <Sidebar 
      onClick={handleSidebarClick} 
      className="border-r border-t border-b" 
      style={{ 
        borderRightColor: 'var(--border-subtle)',
        borderTopColor: 'var(--border-subtle)', 
        borderBottomColor: 'var(--border-subtle)',
        backgroundColor: 'var(--surface-primary)',
        marginTop: isMobile ? '0' : '34px',
        marginBottom: isMobile ? '0' : '21px',
        height: isMobile ? '100%' : 'calc(100vh - 34px - 21px)'
      }}
    >
      <SidebarContent 
        className="h-full w-full"
        style={{ backgroundColor: 'var(--surface-primary)' }}
      >
        {/* Mobile background wrapper */}
        <div 
          className="h-full w-full"
          style={{ 
            backgroundColor: isMobile ? 'var(--surface-primary)' : 'transparent'
          }}
        >
        {/* Files Section */}
        <SidebarGroup className="bg-sidebar">
          <SidebarGroupLabel asChild>
            <div className="flex h-[32px] items-center justify-between px-3 border-b group rounded-none" style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}>
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
              )}
            </div>
          </SidebarGroupLabel>
          
          {isChatsExpanded && (
            <SidebarGroupContent className="border-b" style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}>
              <FileList
                files={files}
                shouldCreateFile={shouldCreateFile}
                onFileCreated={() => setShouldCreateFile(false)}
              />
            </SidebarGroupContent>
          )}
        </SidebarGroup>


        {/* Capabilities Section */}
        <SidebarGroup className="bg-sidebar">
          <SidebarGroupLabel asChild>
            <div className="flex h-[32px] items-center px-3 border-b rounded-none" style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}>
              <button
                onClick={() => setIsCapabilitiesExpanded(!isCapabilitiesExpanded)}
                className="flex items-center gap-2 text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                {isCapabilitiesExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Capabilities
              </button>
            </div>
          </SidebarGroupLabel>
          
          {isCapabilitiesExpanded && (
            <SidebarGroupContent className="border-b" style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}>
              <div className="px-3 py-2 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                Coming soon
              </div>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}