"use client";

import { ChevronDown, ChevronRight, MessageSquare, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FileTree } from "../file-tree/FileTree";
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
  const [shouldCreateBlog, setShouldCreateBlog] = useState(false);
  const [isHoveringFiles, setIsHoveringFiles] = useState(false);
  
  // Check if user is authenticated
  const currentUser = useQuery(api.users.current);
  
  // Fetch files based on authentication status
  const authenticatedFiles = useQuery(api.files.list, currentUser ? {} : "skip");
  const publicFiles = useQuery(api.files.listPublic, currentUser ? "skip" : {});
  
  // Use appropriate files based on authentication
  const files = currentUser ? authenticatedFiles : publicFiles;
  
  // Get user's organization and team for URL generation
  const userOrg = useQuery(api.organizations.getCurrentUserOrg);
  const userTeam = useQuery(api.teams.getCurrentUserTeam);
  
  const handleCreateFile = async () => {
    setShouldCreateFile(true);
  };

  const handleCreateBlog = async () => {
    setShouldCreateBlog(true);
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
        className="h-full w-full flex flex-col"
        style={{ backgroundColor: 'var(--surface-primary)' }}
      >
        {/* Mobile background wrapper */}
        <div 
          className="h-full w-full flex flex-col"
          style={{ 
            backgroundColor: isMobile ? 'var(--surface-primary)' : 'transparent'
          }}
        >
        {/* Files Section - Takes up available space */}
        <div 
          className="flex-1 overflow-hidden"
          onMouseEnter={() => setIsHoveringFiles(true)}
          onMouseLeave={() => setIsHoveringFiles(false)}
        >
          <SidebarGroup className="bg-sidebar h-full flex flex-col">
            <SidebarGroupLabel asChild>
              <div 
                className="flex h-[32px] items-center justify-between px-3 border-b group rounded-none" 
                style={{ borderBottomColor: 'var(--border-subtle)', borderBottomWidth: '1px' }}
              >
                <button
                  onClick={() => setIsChatsExpanded(!isChatsExpanded)}
                  className="flex items-center text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {isChatsExpanded ? (
                    <ChevronDown className="h-4 w-4 mr-1" style={{ opacity: 0.6 }} />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-1" style={{ opacity: 0.6 }} />
                  )}
                  Files
                </button>
                {isChatsExpanded && currentUser && isHoveringFiles && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleCreateFile}
                      className="p-1 transition-all focus:outline-none"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="New Chat"
                    >
                      <MessageSquare className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button
                      onClick={handleCreateBlog}
                      className="p-1 transition-all focus:outline-none"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="New Blog"
                    >
                      <FileText className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                )}
              </div>
            </SidebarGroupLabel>
            
            {isChatsExpanded && (
              <SidebarGroupContent className="flex-1 overflow-y-auto">
                <FileTree
                  files={files}
                  userOrg={userOrg || undefined}
                  userTeam={userTeam || undefined}
                  onCreateFile={currentUser && shouldCreateFile ? () => setShouldCreateFile(false) : undefined}
                  onCreateBlog={currentUser && shouldCreateBlog ? () => setShouldCreateBlog(false) : undefined}
                />
              </SidebarGroupContent>
            )}
          </SidebarGroup>
        </div>

        {/* Capabilities Section - Stays at bottom */}
        <SidebarGroup className="bg-sidebar mt-auto">
          <SidebarGroupLabel asChild>
            <div className="flex h-[32px] items-center px-3 border-t border-b rounded-none" style={{ borderTopColor: 'var(--border-subtle)', borderBottomColor: 'var(--border-subtle)', borderTopWidth: '1px', borderBottomWidth: '1px' }}>
              <button
                onClick={() => setIsCapabilitiesExpanded(!isCapabilitiesExpanded)}
                className="flex items-center text-xs font-bold uppercase text-sidebar-foreground hover:text-foreground transition-colors focus:outline-none"
              >
                {isCapabilitiesExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" style={{ opacity: 0.6 }} />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" style={{ opacity: 0.6 }} />
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