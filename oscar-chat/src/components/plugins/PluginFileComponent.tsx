"use client";

import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PluginFileViewer } from './PluginFileViewer';
import { ChatSidebar } from './ChatSidebar';

interface PluginFileComponentProps {
  pluginId: string;
  filePath: string;
  fileName: string;
  organizationId: string;
}

export const PluginFileComponent = ({ pluginId, filePath, fileName, organizationId }: PluginFileComponentProps) => {
  return (
    <div className="h-full bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* File Content Panel */}
        <ResizablePanel defaultSize={70} minSize={50}>
          <PluginFileViewer
            pluginId={pluginId}
            filePath={filePath}
            fileName={fileName}
            organizationId={organizationId}
          />
        </ResizablePanel>
        <ResizableHandle />
        {/* Chat Sidebar Panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <ChatSidebar pluginId={pluginId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};