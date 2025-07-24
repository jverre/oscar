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

interface PluginBuilderProps {
  pluginName?: string;
  pluginId?: string;
}


// Main Content Component
function MainContent({ pluginId }: { pluginId?: string }) {
  const [pluginName, setPluginName] = useState('');
  const [fileExtension, setFileExtension] = useState('');

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
              className="h-6 text-xs px-2 py-1"
            />
          </div>
          <div className="w-20">
            <Input
              type="text"
              placeholder=".ext"
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
              className="h-6 text-xs px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4">
        <SandboxIframe pluginId={pluginId} />
      </div>
    </div>
  );
}

export function PluginBuilder({ pluginName = "New Plugin", pluginId }: PluginBuilderProps) {
  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Content Panel */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <MainContent pluginId={pluginId} />
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