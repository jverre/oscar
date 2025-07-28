import React, { useMemo } from "react";
import { FileGroupSectionProps } from "./types";
import { buildTreeFromFiles } from "./utils";
import { TreeNodeComponent } from "./TreeNodeComponent";

export const FileGroupSection = ({ 
  title, 
  files, 
  icon, 
  isPublic,
  pendingItems,
  onSavePending,
  onCancelPending,
  onDelete,
  onRename,
  onToggleVisibility,
  organizationId
}: FileGroupSectionProps) => {
  const relevantPendingItems = pendingItems.filter(item => item.isPublic === isPublic);
  const treeNodes = useMemo(() => {
    return buildTreeFromFiles(files || [], relevantPendingItems);
  }, [files, relevantPendingItems]);

  return (
    <div className="mb-3">
      {/* Folder-like header */}
      <div className="flex items-center h-6 pl-1 text-sm cursor-default select-none">
        <div className="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0">
          {icon}
        </div>
        <span className="text-xs font-medium text-foreground/80">
          {title}
        </span>
      </div>
      
      {/* Files in this group */}
      <div>
        {treeNodes.map((node) => (
          <TreeNodeComponent 
            key={node.id} 
            node={node} 
            level={1}
            onSavePending={onSavePending}
            onCancelPending={onCancelPending}
            onDelete={onDelete}
            onRename={onRename}
            onToggleVisibility={onToggleVisibility}
            organizationId={organizationId}
          />
        ))}
      </div>
    </div>
  );
}; 