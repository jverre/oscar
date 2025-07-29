import React, { useMemo } from "react";
import { FileGroupSectionProps } from "./types";
import { buildTreeFromFiles } from "./utils";
import { TreeNodeComponent } from "./TreeNodeComponent";

export const FileGroupSection = ({ 
  title, 
  files, 
  icon, 
  isPublic: _isPublic, // eslint-disable-line @typescript-eslint/no-unused-vars
  creatingItem,
  onSaveCreating,
  onCancelCreating,
  onDelete,
  onRename,
  onToggleVisibility,
  organizationId
}: FileGroupSectionProps) => {
  const treeNodes = useMemo(() => {
    return buildTreeFromFiles(files || []);
  }, [files]);

  // Create a virtual node for the creating item
  const creatingNode = creatingItem ? {
    id: 'creating',
    name: 'Untitled',
    path: 'Untitled',
    isFile: creatingItem.type === 'file',
    isPending: true,
    isEditing: true,
    type: 'user' as const,
    isPublic: creatingItem.isPublic,
  } : null;

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
        {/* Show creating item first if it exists */}
        {creatingNode && (
          <TreeNodeComponent 
            key="creating"
            node={creatingNode} 
            level={1}
            onSaveCreating={onSaveCreating}
            onCancelCreating={onCancelCreating}
            onDelete={onDelete}
            onRename={onRename}
            onToggleVisibility={onToggleVisibility}
            organizationId={organizationId}
          />
        )}
        {treeNodes.map((node) => (
          <TreeNodeComponent 
            key={node.id} 
            node={node} 
            level={1}
            onSaveCreating={onSaveCreating}
            onCancelCreating={onCancelCreating}
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