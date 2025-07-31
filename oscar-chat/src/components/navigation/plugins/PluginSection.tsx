"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useMutation } from "convex/react";
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
  onToggleExpanded
}: {
  plugin: Record<string, unknown>;
  onDelete?: (id: string) => void;
  onOpenPlugin?: () => void;
  isTabActive?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: (pluginId: string) => void;
}) => {

  const handlePluginClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chevron-button')) {
      return;
    }
    onOpenPlugin?.();
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
                  onToggleExpanded?.(plugin._id as string);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-foreground/70" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-foreground/70" />
                )}
              </div>
              
              <span className="truncate text-xs leading-none">
                {String(plugin.name)}
              </span>
              
              {Boolean(plugin.isTemplate) && (
                <span className="text-xs text-blue-500/80 ml-1">(default)</span>
              )}
            </div>
          </div>
        </ContextMenuTrigger>
        
        {!plugin.isTemplate && (
          <ContextMenuContent>
            <ContextMenuItem 
              onClick={() => onDelete?.(plugin._id as string)}
              className="text-red-600"
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
      
      {isExpanded && (
        <PluginFileList 
          pluginId={plugin._id as string}
          organizationId={plugin.organizationId as Id<"organizations">}
        />
      )}
    </div>
  );
};

export const PluginSection = ({ organizationId }: PluginSectionProps) => {
  const { data: session } = useSession();
  const { openContent, activeFile, closeTab } = useFileContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const [plugins, setPlugins] = useState<Record<string, unknown>[]>([]);
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
  }, [session?.user?.id, organizationId, getPlugins]);
  
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
      
      await createPlugin({
        name: pluginName,
        organizationId,
        visibility: "private",
      });
      
      // Refresh plugins list
      const updatedPlugins = await getPlugins({
        organizationId,
      });
      setPlugins(updatedPlugins);
      
      // Get the created plugin ID to use as the file path
      const newPlugin = updatedPlugins.find(p => p.name === pluginName);
      if (newPlugin) {
        openContent(newPlugin._id as string, pluginName);
      }
    } catch (error) {
      console.error("Failed to create plugin:", error);
    }
  };

  const handleDeletePlugin = async (pluginId: Id<"plugins">) => {
    try {
      // Find the plugin to get its fileId
      const plugin = plugins?.find(p => p._id === pluginId);
      if (plugin?.fileId) {
        closeTab(String(plugin.fileId));
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
              key={plugin._id as string}
              plugin={plugin}
              onDelete={(id) => handleDeletePlugin(id as Id<"plugins">)}
              onOpenPlugin={() => openContent(plugin._id as string, String(plugin.name))}
              isTabActive={activeFile === plugin._id}
              isExpanded={expandedPlugins.has(plugin._id as string)}
              onToggleExpanded={handleTogglePluginExpanded}
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