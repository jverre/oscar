import React, { useState } from "react";
import { ChevronRight, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";
import { useFileContext } from "@/components/providers/FileProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TreeNodeComponentProps } from "./types";
import { getFileIcon, getFolderIcon } from "./utils";
import { InlineEditor } from "./InlineEditor";

export const TreeNodeComponent = ({ 
  node, 
  level = 0,
  onSavePending,
  onCancelPending,
  onDelete,
  onRename,
  organizationId
}: TreeNodeComponentProps) => {
  const { activeFile, openFile } = useFileContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const isActive = activeFile === node.path;
  
  const handleClick = () => {
    if (node.isPending || node.isEditing || isRenaming) return;
    
    if (node.isFile) {
      openFile(node.path);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSave = (name: string) => {
    if (node.isPending && onSavePending) {
      onSavePending(node.id, name);
    } else if (isRenaming && onRename && node.fileId) {
      onRename(node.fileId, name);
      setIsRenaming(false);
    }
  };

  const handleCancel = () => {
    if (node.isPending && onCancelPending) {
      onCancelPending(node.id);
    } else if (isRenaming) {
      setIsRenaming(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      if (node.isFile && node.fileId) {
        // Delete a file
        onDelete(node.fileId);
      } else if (!node.isFile) {
        // Delete a folder (either with fileId or inferred from path)
        if (node.fileId) {
          onDelete(node.fileId);
        } else {
          onDelete(undefined, node.path);
        }
      }
    }
  };

  const handleRename = () => {
    setIsRenaming(true);
  };

  const treeNodeContent = (
    <div>
      <div
        className={cn(
          "flex items-center h-6 text-sm cursor-pointer select-none group",
          "transition-colors duration-150",
          "text-foreground/70",
          isActive 
            ? "bg-sidebar-accent-hover" 
            : "hover:bg-sidebar-accent-hover",
          node.isPending && "bg-sidebar-accent/30"
        )}
        onClick={handleClick}
      >
        <div style={{ paddingLeft: `${level * 12 + 4}px` }} className="flex items-center flex-1">
          {/* Icon container - fixed width for alignment */}
          <div className="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0">
            {!node.isFile ? (
              node.isPending ? (
                getFolderIcon()
              ) : (
                <ChevronRight 
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-150",
                    isExpanded ? "rotate-90" : "rotate-0"
                  )}
                />
              )
            ) : (
              getFileIcon()
            )}
          </div>
          
          {/* File/folder name */}
          {(node.isEditing && node.isPending) || isRenaming ? (
            <InlineEditor
              initialName={node.name}
              isFile={node.isFile}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <span className="truncate text-xs leading-none">
              {node.name}
            </span>
          )}
        </div>
      </div>
      
      {!node.isFile && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent 
              key={child.id} 
              node={child} 
              level={level + 1}
              onSavePending={onSavePending}
              onCancelPending={onCancelPending}
              onDelete={onDelete}
              onRename={onRename}
              organizationId={organizationId}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Don't wrap pending items in context menu
  if (node.isPending) {
    return treeNodeContent;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {treeNodeContent}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRename}>
          <Edit2 className="h-4 w-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}; 