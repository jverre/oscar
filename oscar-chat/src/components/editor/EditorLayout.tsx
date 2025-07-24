import React from 'react';
import { TabBar } from './tabs/TabBar';
import { useFileContext } from '@/components/providers/FileProvider';

export const EditorLayout = () => {
  const { activeFile } = useFileContext();

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <TabBar />
      
      {/* Editor Content */}
      <div className="flex-1 p-4 bg-background">
        {activeFile ? (
          <div className="h-full">
            <div className="text-sm text-muted-foreground mb-2">
              Editing: {activeFile}
            </div>
            <div className="h-full border border-border rounded-md p-4">
              {/* Your editor component will go here */}
              <div className="text-muted-foreground">
                File content for {activeFile} would be displayed here.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Select a file from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 