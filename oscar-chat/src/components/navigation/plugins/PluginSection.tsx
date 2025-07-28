"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useSession } from "next-auth/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useFileContext } from "@/components/providers/FileProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { PluginFileList } from "./PluginFileList";

interface PluginSectionProps {
  organizationId: Id<"organizations">;
}

const PluginItem = ({ 
  plugin, 
  onDelete,
  onOpenPlugin,
  isTabActive,
  isExpanded,
  onToggleExpanded,
  organizationId
}: {
  plugin: any;
  onDelete?: (id: any) => void;
  onOpenPlugin?: (fileId: string) => void;
  isTabActive?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: (pluginId: string) => void;
  organizationId: Id<"organizations">;
}) => {
  const { openFile } = useFileContext();

  const handlePluginClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chevron-button')) {
      return;
    }
    if (plugin.fileId) {
      onOpenPlugin?.(plugin.fileId);
    } else {
      console.warn(`Plugin ${plugin.name} has no fileId yet`);
    }
  };

  const handleFileClick = (_: string, fileName: string, filePath: string) => {
    openFile(filePath, fileName, 'plugin');
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center h-6 text-sm cursor-pointer select-none group transition-colors duration-150 text-foreground/70",
              isTabActive ? "bg-sidebar-accent-hover" : "hover:bg-sidebar-accent-hover"
            )}
            onClick={handlePluginClick}
          >
            <div style={{ paddingLeft: `${1 * 12 + 4}px` }} className="flex items-center flex-1">
              <div 
                className="chevron-button flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0 cursor-pointer hover:bg-sidebar-accent-hover rounded-sm transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded?.(plugin._id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-foreground/70" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-foreground/70" />
                )}
              </div>
              
              <span className="truncate text-xs leading-none">
                {plugin.name}
              </span>
              
              {plugin.isTemplate && (
                <span className="text-xs text-blue-500/80 ml-1">(default)</span>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        
        {!plugin.isTemplate && (
          <ContextMenuContent>
            <ContextMenuItem 
              onClick={() => onDelete?.(plugin._id)}
              className="text-red-600"
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
      
      {isExpanded && (
        <PluginFileList
          pluginId={plugin._id}
          organizationId={organizationId}
          onFileClick={handleFileClick}
        />
      )}
    </div>
  );
};

export const PluginSection = ({ organizationId }: PluginSectionProps) => {
  const { data: session } = useSession();
  const { openFile, activeFile, closeTab } = useFileContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const [plugins, setPlugins] = useState<any[]>([]);
  const getPlugins = useMutation(api.plugins.getPlugins);
  const createPlugin = useMutation(api.plugins.createPlugin);
  const deletePlugin = useMutation(api.plugins.deletePlugin);
  
  // Load plugins on mount and when session changes
  React.useEffect(() => {
    if (session?.user?.id) {
      getPlugins({
        organizationId,
      }).then(setPlugins);
    }
  }, [session?.user?.id, organizationId]);
  
  const handleCreatePlugin = async () => {
    if (!session?.user?.id) return;
    
    try {
      const baseName = "New Plugin";
      let pluginName = baseName;
      let counter = 1;
      
      if (plugins) {
        const existingNames = plugins.map(p => p.name);
        while (existingNames.includes(pluginName)) {
          pluginName = `${baseName} (${counter})`;
          counter++;
        }
      }
      
      const result = await createPlugin({
        name: pluginName,
        organizationId,
        visibility: "private",
      });
      
      // Refresh plugins list
      const updatedPlugins = await getPlugins({
        organizationId,
      });
      setPlugins(updatedPlugins);
      
      openFile(result.fileId, pluginName, 'plugin');
    } catch (error) {
      console.error("Failed to create plugin:", error);
    }
  };

  const handleDeletePlugin = async (pluginId: Id<"plugins">) => {
    try {
      // Find the plugin to get its fileId
      const plugin = plugins?.find(p => p._id === pluginId);
      if (plugin?.fileId) {
        closeTab(plugin.fileId);
      }
      await deletePlugin({ organizationId, pluginId });
      
      // Refresh plugins list
      if (session?.user?.id) {
        const updatedPlugins = await getPlugins({
          organizationId,
        });
        setPlugins(updatedPlugins);
      }
    } catch (error) {
      console.error("Failed to delete plugin:", error);
    }
  };

  const handleTogglePluginExpanded = (pluginId: string) => {
    setExpandedPlugins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId);
      } else {
        newSet.add(pluginId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full bg-background font-mono text-xs border-t border-sidebar-border">
      <div 
        className="group flex items-center justify-between h-8 px-2 text-sm font-medium text-foreground/80 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent-hover/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1 text-xs uppercase tracking-wide hover:text-foreground transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Plugins</span>
        </div>
        
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreatePlugin();
            }}
            className="p-1 hover:bg-sidebar-accent-hover rounded-sm transition-colors"
            title="New Plugin"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div>
          {plugins?.map((plugin) => (
            <PluginItem
              key={plugin._id}
              plugin={plugin}
              onDelete={handleDeletePlugin}
              onOpenPlugin={(fileId) => openFile(fileId, plugin.name, 'plugin')}
              isTabActive={activeFile === plugin.fileId}
              isExpanded={expandedPlugins.has(plugin._id)}
              onToggleExpanded={handleTogglePluginExpanded}
              organizationId={organizationId}
            />
          ))}
          
          {(!plugins || plugins.length === 0) && (
            <div className="flex items-center h-6 text-sm cursor-default select-none text-foreground/70">
              <div style={{ paddingLeft: `${1 * 12 + 4}px` }} className="flex items-center flex-1">
                <span className="text-xs leading-none text-muted-foreground/60">
                  No plugins yet
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};