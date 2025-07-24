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

// Simple toggle switch component
const ToggleSwitch = ({ 
  isActive, 
  onToggle 
}: { 
  isActive: boolean;
  onToggle: () => void;
}) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex items-center w-6 h-2.5 rounded-full transition-colors focus:outline-none",
        isActive ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 transform rounded-full bg-background transition-transform",
          isActive ? "translate-x-3.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
};

// Simple inline editor component for plugin names
const PluginInlineEditor = ({ 
  initialName, 
  onSave, 
  onCancel 
}: { 
  initialName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(initialName);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (name.trim()) {
        onSave(name.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (name.trim()) {
      onSave(name.trim());
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="bg-transparent text-xs leading-none outline-none border-none p-0 w-full"
    />
  );
};

// Plugin item component that handles both pending and existing plugins
const PluginItem = ({ 
  plugin, 
  isPending, 
  onSave, 
  onCancel, 
  onToggleActive, 
  onDelete,
  onOpenPlugin,
  isTabActive,
  isExpanded,
  onToggleExpanded,
  onFileClick
}: {
  plugin: any;
  isPending: boolean;
  onSave?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
  onToggleActive?: (id: any) => void;
  onDelete?: (id: any) => void;
  onOpenPlugin?: (pluginId: string, pluginName: string) => void;
  isTabActive?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: (pluginId: string) => void;
  onFileClick?: (pluginId: string, fileName: string, filePath: string) => void;
}) => {
  if (isPending) {
    return (
      <div className="flex items-center h-6 text-sm cursor-pointer select-none group transition-colors duration-150 text-foreground/70 bg-sidebar-accent/30">
        <div style={{ paddingLeft: `${1 * 12 + 4}px` }} className="flex items-center flex-1">
          <div className="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          </div>
          
          <PluginInlineEditor
            initialName={plugin.name}
            onSave={(name) => onSave?.(plugin.id, name)}
            onCancel={() => onCancel?.(plugin.id)}
          />
        </div>
      </div>
    );
  }

  const handlePluginClick = (e: React.MouseEvent) => {
    // Don't open plugin if clicking on toggle switch or chevron
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.chevron-button')) {
      return;
    }
    onOpenPlugin?.(plugin._id, plugin.name);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpanded?.(plugin._id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            "flex items-center h-6 text-sm cursor-pointer select-none group",
            "transition-colors duration-150",
            "text-foreground/70",
            isTabActive 
              ? "bg-sidebar-accent-hover" 
              : "hover:bg-sidebar-accent-hover"
          )}
          onClick={handlePluginClick}
        >
          <div style={{ paddingLeft: `${1 * 12 + 4}px` }} className="flex items-center flex-1">
            <div 
              className="chevron-button flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0 cursor-pointer hover:bg-sidebar-accent-hover rounded-sm transition-colors"
              onClick={handleChevronClick}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-foreground/70" />
              ) : (
                <ChevronRight className="h-3 w-3 text-foreground/70" />
              )}
            </div>
            
            <div
              className={cn(
                "w-2 h-2 rounded-full mr-2 flex-shrink-0",
                plugin.isActive ? "bg-green-500" : "bg-muted-foreground/60"
              )}
            />
            
            <span className="truncate text-xs leading-none">
              {plugin.name}
            </span>
            
            {plugin.visibility === "public" && (
              <span className="text-xs text-muted-foreground/60 ml-1">(public)</span>
            )}
          </div>
          
          <div className="mr-1">
            <ToggleSwitch
              isActive={plugin.isActive}
              onToggle={() => onToggleActive?.(plugin._id)}
            />
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onToggleActive?.(plugin._id)}
        >
          {plugin.isActive ? "Deactivate" : "Activate"}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onDelete?.(plugin._id)}
          className="text-red-600"
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// Plugin with file list component that wraps PluginItem and its file list
const PluginWithFiles = ({ 
  plugin, 
  isPending, 
  onSave, 
  onCancel, 
  onToggleActive, 
  onDelete,
  onOpenPlugin,
  isTabActive,
  isExpanded,
  onToggleExpanded,
  onFileClick,
  organizationId
}: {
  plugin: any;
  isPending: boolean;
  onSave?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
  onToggleActive?: (id: any) => void;
  onDelete?: (id: any) => void;
  onOpenPlugin?: (pluginId: string, pluginName: string) => void;
  isTabActive?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: (pluginId: string) => void;
  onFileClick?: (pluginId: string, fileName: string, filePath: string) => void;
  organizationId: Id<"organizations">;
}) => {
  return (
    <div>
      <PluginItem
        plugin={plugin}
        isPending={isPending}
        onSave={onSave}
        onCancel={onCancel}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
        onOpenPlugin={onOpenPlugin}
        isTabActive={isTabActive}
        isExpanded={isExpanded}
        onToggleExpanded={onToggleExpanded}
        onFileClick={onFileClick}
      />
      
      {/* Show file list when plugin is expanded and not pending */}
      {isExpanded && !isPending && (
        <PluginFileList
          pluginId={plugin._id}
          organizationId={organizationId}
          onFileClick={onFileClick || (() => {})}
        />
      )}
    </div>
  );
};

export const PluginSection = ({ organizationId }: PluginSectionProps) => {
  const { data: session } = useSession();
  const { openPlugin, openPluginFile, activeFile, closeTab } = useFileContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());
  const plugins = useQuery(api.plugins.getPlugins, { organizationId });
  const createPlugin = useMutation(api.plugins.createPlugin);
  const toggleActive = useMutation(api.plugins.togglePluginActive);
  const deletePlugin = useMutation(api.plugins.deletePlugin);

  const handleCreatePlugin = async () => {
    console.log("Create plugin button clicked");
    console.log("Session:", session);
    console.log("User ID:", session?.user?.id);
    console.log("Organization ID:", organizationId);
    
    if (!session?.user?.id) {
      console.log("No user session - returning early");
      return;
    }
    
    try {
      // Generate unique plugin name
      const baseName = "New Plugin";
      let pluginName = baseName;
      let counter = 1;
      
      // Check if name already exists and generate unique name
      if (plugins) {
        const existingNames = plugins.map(p => p.name);
        while (existingNames.includes(pluginName)) {
          pluginName = `${baseName} (${counter})`;
          counter++;
        }
      }
      
      console.log("Creating plugin with:", {
        name: pluginName,
        description: "A new plugin",
        organizationId,
        visibility: "private",
        userId: session.user.id,
      });
      
      // Create a real plugin record immediately
      const pluginId = await createPlugin({
        name: pluginName,
        description: "A new plugin",
        organizationId,
        visibility: "private",
        userId: session.user.id as Id<"users">,
      });
      
      console.log("Plugin created with ID:", pluginId);
      
      // Open the plugin builder with the real plugin ID
      openPlugin(pluginId, pluginName);
      console.log("Plugin opened");
    } catch (error) {
      console.error("Failed to create plugin:", error);
    }
  };

  const handleToggleActive = async (pluginId: Id<"plugins">) => {
    try {
      await toggleActive({ pluginId });
    } catch (error) {
      console.error("Failed to toggle plugin:", error);
    }
  };

  const handleDeletePlugin = async (pluginId: Id<"plugins">) => {
    try {
      // Close the plugin tab if it's open
      const tabId = `plugin:${pluginId}`;
      closeTab(tabId);
      
      // Delete the plugin from database
      await deletePlugin({ pluginId });
    } catch (error) {
      console.error("Failed to delete plugin:", error);
    }
  };

  const handleTogglePluginExpanded = (pluginId: string) => {
    console.log("[PLUGIN_EXPAND] Toggling expansion for plugin:", pluginId);
    setExpandedPlugins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId);
        console.log("[PLUGIN_EXPAND] Collapsing plugin:", pluginId);
      } else {
        newSet.add(pluginId);
        console.log("[PLUGIN_EXPAND] Expanding plugin:", pluginId);
      }
      return newSet;
    });
  };

  const handleFileClick = (pluginId: string, fileName: string, filePath: string) => {
    console.log("[PLUGIN_FILE_CLICK] File clicked:", { pluginId, fileName, filePath });
    openPluginFile(pluginId, fileName, filePath, organizationId);
  };

  return (
    <div className="w-full bg-background font-mono text-xs border-t border-sidebar-border">
      {/* Header */}
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

      {/* Content */}
      {isExpanded && (
        <div>
          {/* Plugin list */}
          <div>
            {/* Existing plugins */}
            {plugins?.map((plugin) => (
              <PluginWithFiles
                key={plugin._id}
                plugin={plugin}
                isPending={false}
                onToggleActive={handleToggleActive}
                onDelete={handleDeletePlugin}
                onOpenPlugin={openPlugin}
                isTabActive={activeFile === `plugin:${plugin._id}`}
                isExpanded={expandedPlugins.has(plugin._id)}
                onToggleExpanded={handleTogglePluginExpanded}
                onFileClick={handleFileClick}
                organizationId={organizationId}
              />
            ))}
            
            {plugins?.length === 0 && (
              <div className="flex items-center h-6 text-sm cursor-default select-none text-foreground/70">
                <div style={{ paddingLeft: `${1 * 12 + 4}px` }} className="flex items-center flex-1">
                  <div className="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0"></div>
                  <span className="text-xs leading-none text-muted-foreground/60">
                    No plugins yet
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};