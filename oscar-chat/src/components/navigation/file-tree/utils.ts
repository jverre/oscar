import React from "react";
import { File, Folder } from "lucide-react";
import { TreeNode, PendingItem } from "./types";

export const buildTreeFromFiles = (files: unknown[], pendingItems: PendingItem[] = []): TreeNode[] => {
  if (!files || files.length === 0) {
    // If no files but have pending items, show them at root
    return pendingItems.map(item => ({
      id: item.id,
      name: item.name,
      path: item.name,
      isFile: item.isFile,
      isPending: true,
      isEditing: true,
      children: item.isFile ? undefined : [],
      type: 'user' as const
    }));
  }
  
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];
  
  // Create all nodes from actual files and folders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files.forEach((file: any) => {
    // Handle direct folder entries (type: "directory")
    if (file.type === "directory") {
      const folderNode: TreeNode = {
        id: file.path,
        name: file.path.split('/').pop() || file.path, // Show just the folder name
        path: file.path,
        children: [],
        isFile: false,
        fileId: file._id,
        type: 'user' as const,
        isPublic: file.isPublic
      };
      nodeMap.set(file.path, folderNode);
      rootNodes.push(folderNode);
      return;
    }
    
    // Handle regular files - create intermediate folders as needed
    const pathParts = file.path.split('/');
    let currentPath = '';
    
    pathParts.forEach((part: string, index: number) => {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === pathParts.length - 1;
      
      if (!nodeMap.has(currentPath)) {
        const node: TreeNode = {
          id: currentPath,
          name: part,
          path: currentPath,
          children: isFile ? undefined : [],
          isFile,
          fileId: isFile ? file._id : undefined,
          type: 'user' as const,
          isPublic: isFile ? file.isPublic : undefined
        };
        nodeMap.set(currentPath, node);
        
        if (parentPath) {
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      }
    });
  });
  
  // Add pending items to root level
  pendingItems.forEach(item => {
    const pendingNode: TreeNode = {
      id: item.id,
      name: item.name,
      path: item.name,
      isFile: item.isFile,
      isPending: true,
      isEditing: true,
      children: item.isFile ? undefined : [],
      type: 'user' as const
    };
    rootNodes.push(pendingNode);
  });
  
  return rootNodes;
};

export const getFileIcon = (): React.ReactNode => {
  return React.createElement(File, { className: "h-3 w-3 text-muted-foreground/60" });
};

export const getFolderIcon = (): React.ReactNode => {
  return React.createElement(Folder, { className: "h-3 w-3 text-muted-foreground/60" });
}; 