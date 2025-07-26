"use client";

import { useState, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../../convex/_generated/api';
import { SandboxIframe } from './SandboxIframe';
import { ChatSidebar } from './ChatSidebar';
import { useFileContext } from '../providers/FileProvider';

interface PluginBuilderProps {
  pluginName?: string;
  pluginId?: string;
  fileId?: string;
  organizationId?: string;
}


// Main Content Component
function MainContent({ pluginId, fileId, organizationId, pluginName: initialPluginName }: { pluginId?: string; fileId?: string; organizationId?: string; pluginName?: string }) {
  const [pluginName, setPluginName] = useState(initialPluginName || '');
  const [fileExtension, setFileExtension] = useState('');
  const { updatePluginTabTitle } = useFileContext();
  
  // Add mutation for updating plugin metadata
  const updatePlugin = useMutation(api.plugins?.updatePlugin);
  
  const handlePluginNameBlur = () => {
    if (pluginId && updatePlugin && pluginName !== initialPluginName) {
      updatePlugin({ pluginId: pluginId as any, name: pluginName });
      // Update the tab title
      updatePluginTabTitle(pluginId, pluginName);
    }
  };
  
  const handleExtensionBlur = () => {
    if (pluginId && updatePlugin && fileExtension) {
      updatePlugin({ pluginId: pluginId as any, fileExtension });
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
              className="h-6 text-xs px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        <SandboxIframe pluginId={pluginId} fileId={fileId} organizationId={organizationId} />
      </div>
    </div>
  );
}

export function PluginBuilder({ pluginName = "New Plugin", pluginId, fileId, organizationId }: PluginBuilderProps) {
  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <MainContent pluginId={pluginId} fileId={fileId} organizationId={organizationId} pluginName={pluginName} />
        </ResizablePanel>

        <ResizableHandle />

        {/* Chat Sidebar Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <ChatSidebar pluginId={pluginId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
} 