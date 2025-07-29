"use client";

import { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { SandboxIframe } from './SandboxIframe';
import { ChatSidebar } from './ChatSidebar';
import { useFileContext } from '../providers/FileProvider';

interface PluginBuilderProps {
  fileId: Id<"files">;
}


// Main Content Component
function MainContent({ fileId }: PluginBuilderProps) {
  const { data: session } = useSession();
  const [pluginName, setPluginName] = useState("New Plugin");
  const [fileExtension, setFileExtension] = useState('');
  const { updateTabTitle } = useFileContext();
  
  // Get current user and organization information
  const currentUser = useQuery(
    api.users.currentUser, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );
  
  // Get the file to extract pluginId from the path
  const file = useQuery(api.files.getFileById, { fileId });
  const pluginId = file?.path; // The path contains the pluginId
  
  const updatePlugin = useMutation(api.plugins?.updatePlugin);
  
  // Load plugin data when file is available
  useEffect(() => {
    if (file && pluginId) {
      // For marketplace plugins, pluginId is a string like "marketplace_xxx"
      // For custom plugins, pluginId is an actual plugin ID
      if (pluginId.startsWith('marketplace_')) {
        // For marketplace plugins, we can't update the name/extension
        const fileName = file.path.split('/').pop() || "Marketplace Plugin";
        setPluginName(fileName);
      } else {
        // For custom plugins, we could fetch plugin data here if needed
        const fileName = file.path.split('/').pop() || "New Plugin";
        setPluginName(fileName);
      }
    }
  }, [file, pluginId]);
  
  const handlePluginNameBlur = () => {
    if (pluginId && updatePlugin && !pluginId.startsWith('marketplace_') && currentUser?.organization?._id) {
      updatePlugin({ 
        pluginId: pluginId as Id<"plugins">, 
        organizationId: currentUser.organization._id,
        name: pluginName 
      });
      // Update the tab title
      updateTabTitle(fileId, pluginName);
    }
  };
  
  const handleExtensionBlur = () => {
    if (pluginId && updatePlugin && fileExtension && !pluginId.startsWith('marketplace_') && currentUser?.organization?._id) {
      updatePlugin({ 
        pluginId: pluginId as Id<"plugins">, 
        organizationId: currentUser.organization._id,
        fileExtension 
      });
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border">
        {/* Plugin Configuration */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Plugin name"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              onBlur={handlePluginNameBlur}
              readOnly={pluginId?.startsWith('marketplace_')}
              className="h-6 text-xs px-2 py-1"
            />
          </div>
          <div className="w-20">
            <Input
              type="text"
              placeholder=".ext"
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
              onBlur={handleExtensionBlur}
              readOnly={pluginId?.startsWith('marketplace_')}
              className="h-6 text-xs px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        {pluginId && <SandboxIframe pluginId={pluginId} />}
      </div>
    </div>
  );
}

export function PluginBuilder({ fileId }: PluginBuilderProps) {
  // Get the file to extract pluginId from the path
  const file = useQuery(api.files.getFileById, { fileId });
  const pluginId = file?.path; // The path contains the pluginId

  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <MainContent fileId={fileId} />
        </ResizablePanel>

        <ResizableHandle />

        {/* Chat Sidebar Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          {pluginId && <ChatSidebar pluginId={pluginId} />}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 