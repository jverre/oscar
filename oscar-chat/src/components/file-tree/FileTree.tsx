"use client";

import { useState, useEffect } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { buildFolderStructure, FolderNode } from "@/utils/folderUtils";
import { useFileSelection } from "@/hooks/useFileSelection";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useFolderExpansion } from "@/hooks/useFolderExpansion";
import { useFileNavigation } from "@/hooks/useFileNavigation";
import { FileTreeFolder } from "./FileTreeFolder";
import { FileContextMenu } from "../chat/FileContextMenu";
import { DeleteFileDialog } from "../chat/DeleteFileDialog";

interface FileTreeProps {
  files: Doc<"files">[] | undefined;
  userOrg?: Doc<"organizations">;
  userTeam?: Doc<"teams">;
  onCreateFile?: () => void;
  onCreateBlog?: () => void;
}

interface ContextMenuState {
  fileId: string;
  x: number;
  y: number;
  isMultipleSelected: boolean;
  isFolder?: boolean;
}

interface DeleteDialogState {
  fileId?: string;
  name?: string;
  selectedIds?: Set<string>;
  count?: number;
}

export function FileTree({ 
  files, 
  userOrg, 
  userTeam,
  onCreateFile,
  onCreateBlog 
}: FileTreeProps) {
  const [folderStructure, setFolderStructure] = useState<FolderNode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  
  const selection = useFileSelection(files);
  const fileOps = useFileOperations();
  const folderExpansion = useFolderExpansion();
  const navigation = useFileNavigation({ userOrg, userTeam });
  
  useEffect(() => {
    if (!files) return;
    
    const structure = buildFolderStructure(files);
    const expandedStructure = folderExpansion.applyExpansionState(structure);
    setFolderStructure(expandedStructure);
  }, [files, folderExpansion.applyExpansionState]);
  
  const handleContextMenu = (e: React.MouseEvent, fileId: string, isFolder: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isMultipleSelected = selection.selectedIds.size > 1 && selection.isFileSelected(fileId);
    
    setContextMenu({
      fileId,
      x: e.clientX,
      y: e.clientY,
      isMultipleSelected,
      isFolder
    });
  };
  
  const handleDelete = async () => {
    if (!deleteDialog) return;
    
    if (deleteDialog.selectedIds) {
      await fileOps.deleteFiles(Array.from(deleteDialog.selectedIds) as Id<"files">[]);
      selection.clearSelection();
    } else if (deleteDialog.fileId) {
      await fileOps.deleteFiles([deleteDialog.fileId as Id<"files">]);
    }
    
    setDeleteDialog(null);
  };
  
  const handleRename = (fileId: string) => {
    document.dispatchEvent(new CustomEvent('startFileRename', { 
      detail: { fileId } 
    }));
    setContextMenu(null);
  };
  
  const handleRegenerateTitle = async (fileId: string) => {
    await fileOps.regenerateFileTitle(fileId as Id<"files">);
    setContextMenu(null);
  };
  
  if (!files) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Loading files...
      </div>
    );
  }
  
  if (!folderStructure) {
    return null;
  }
  
  return (
    <>
      <div className="space-y-0" data-sidebar>
        {Array.from(folderStructure.children.values()).map(childFolder => (
          <FileTreeFolder
            key={childFolder.path}
            folder={childFolder}
            level={0}
            selection={selection}
            fileOps={fileOps}
            folderExpansion={folderExpansion}
            navigation={navigation}
            onContextMenu={handleContextMenu}
            onDelete={(fileId, name) => setDeleteDialog({ fileId, name })}
            onCreateFile={onCreateFile}
            onCreateBlog={onCreateBlog}
          />
        ))}
      </div>
      
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            const file = files?.find(f => f._id === contextMenu.fileId);
            if (file) navigation.openFile(file);
          }}
          onRename={() => handleRename(contextMenu.fileId)}
          onDelete={() => {
            if (contextMenu.isMultipleSelected) {
              setDeleteDialog({
                selectedIds: selection.selectedIds,
                count: selection.selectedIds.size
              });
            } else {
              const file = files?.find(f => f._id === contextMenu.fileId);
              setDeleteDialog({
                fileId: contextMenu.fileId,
                name: file?.name
              });
            }
          }}
          onRegenerateTitle={() => handleRegenerateTitle(contextMenu.fileId)}
          onOpenAll={() => {
            const filesToOpen = files?.filter(f => selection.isFileSelected(f._id)) || [];
            navigation.openMultipleFiles(filesToOpen);
          }}
          isMultipleSelected={contextMenu.isMultipleSelected}
          isChatFile={(() => {
            const file = files?.find(f => f._id === contextMenu.fileId);
            return file?.name.endsWith('.chat') || false;
          })()}
        />
      )}
      
      <DeleteFileDialog
        isOpen={!!deleteDialog}
        fileName={deleteDialog?.name}
        fileCount={deleteDialog?.count}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}