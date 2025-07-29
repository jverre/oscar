"use client";

import { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useTenant } from '@/components/providers/TenantProvider';
import { Id } from '../../../convex/_generated/dataModel';
import { SandboxIframe } from './SandboxIframe';
import { ChatSidebar } from './ChatSidebar';
import { useFileContext } from '../providers/FileProvider';

interface PluginBuilderProps {
  fileId: Id<"files">;
}


// Main Content Component
function MainContent({ fileId }: PluginBuilderProps) {
  const { organizationId } = useTenant();
  const [pluginName, setPluginName] = useState("New Plugin");
  const [fileExtension, setFileExtension] = useState('');
  const { updateTabTitle } = useFileContext();
  
  // Get the file to extract pluginId from the path
  const file = useQuery(api.files.getFileById, { fileId });
  const pluginId = file?.path; // The path contains the pluginId
  
  // Get the actual plugin data to get the correct name
  const pluginData = useQuery(
    api.plugins.getPluginData,
    pluginId && organizationId ? { 
      pluginId: pluginId as Id<"plugins"> | Id<"organizationMarketplacePlugins"> | string, 
      organizationId: organizationId 
    } : "skip"
  );
  
  const updatePlugin = useMutation(api.plugins?.updatePlugin);
  
  // Load plugin data when available
  useEffect(() => {
    if (pluginData) {
      setPluginName(pluginData.name || "New Plugin");
      if (pluginData.fileExtension) {
        setFileExtension(pluginData.fileExtension);
      }
    } else if (file && pluginId) {
      // Fallback to file path parsing if plugin data is not available
      const fileName = file.path.split('/').pop() || "New Plugin";
      setPluginName(fileName);
    }
  }, [pluginData, file, pluginId]);
  
  const handlePluginNameBlur = () => {
    if (pluginId && updatePlugin && !pluginId.startsWith('marketplace_') && organizationId) {
      updatePlugin({ 
        pluginId: pluginId as Id<"plugins">, 
        organizationId: organizationId,
        name: pluginName 
      });
      // Update the tab title using the plugin path
      if (file?.path) {
        updateTabTitle(file.path, pluginName);
      }
    }
  };
  
  const handleExtensionBlur = () => {
    if (pluginId && updatePlugin && fileExtension && !pluginId.startsWith('marketplace_') && organizationId) {
      updatePlugin({ 
        pluginId: pluginId as Id<"plugins">, 
        organizationId: organizationId,
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