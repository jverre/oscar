import React, { useState } from "react";
import { Lock, Globe } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTenant } from "@/components/providers/TenantProvider";
import { PendingItem } from "./types";
import { FilesHeader } from "./FilesHeader";
import { FileGroupSection } from "./FileGroupSection";
import { Id } from "../../../../convex/_generated/dataModel";

export const FileTree = () => {
  const { organizationId, user } = useTenant();
  const createFileMutation = useMutation(api.files.createFile);
  const createFolderMutation = useMutation(api.files.createFolder);
  const deleteFileMutation = useMutation(api.files.deleteFile);
  const deleteFolderMutation = useMutation(api.files.deleteFolder);
  const renameFileMutation = useMutation(api.files.renameFile);
  const toggleVisibilityMutation = useMutation(api.files.toggleFileVisibility);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  
  const filesData = useQuery(
    api.files.getFiles, 
    organizationId ? { organizationId } : "skip"
  );
  
  console.log('[FileTree] Files data:', filesData);

  const handleCreateFile = () => {
    const newId = `pending-file-${Date.now()}`;
    const newPendingFile: PendingItem = {
      id: newId,
      name: "Untitled",
      isFile: true,
      isPublic: false, // Default to private
    };
    setPendingItems(prev => [...prev, newPendingFile]);
  };

  const handleCreateFolder = () => {
    const newId = `pending-folder-${Date.now()}`;
    const newPendingFolder: PendingItem = {
      id: newId,
      name: "Untitled",
      isFile: false,
      isPublic: false, // Default to private
    };
    setPendingItems(prev => [...prev, newPendingFolder]);
  };

  const handleSavePending = async (id: string, name: string) => {
    const pendingItem = pendingItems.find(item => item.id === id);
    if (!pendingItem || !user?._id || !organizationId) return;

    try {
      if (pendingItem.isFile) {
        const filePath = name.includes('.') ? name : `${name}.blog`;
        await createFileMutation({
          organizationId: organizationId,
          path: filePath,
          content: "",
          type: "user",
          isPublic: pendingItem.isPublic,
        });
      } else {
        await createFolderMutation({
          organizationId: organizationId,
          path: name,
          isPublic: pendingItem.isPublic,
        });
      }
      
      // Remove from pending items
      setPendingItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Error creating item. Please try again.");
    }
  };

  const handleCancelPending = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDelete = async (fileId?: Id<"files">, folderPath?: string) => {
    if (!user?._id || !organizationId) return;

    try {
      if (fileId) {
        // Delete a single file
        await deleteFileMutation({
          organizationId: organizationId,
          fileId: fileId,
        });
      } else if (folderPath) {
        // Delete a folder (and all files within it)
        await deleteFolderMutation({
          organizationId: organizationId,
          folderPath: folderPath,
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting item. Please try again.");
    }
  };

  const handleRename = async (fileId: Id<"files">, newName: string) => {
    if (!user?._id || !organizationId) return;

    try {
      await renameFileMutation({
        organizationId: organizationId,
        fileId: fileId,
        newPath: newName,
      });
    } catch (error) {
      console.error("Error renaming file:", error);
      alert("Error renaming file. Please try again.");
    }
  };

  const handleToggleVisibility = async (fileId: Id<"files">) => {
    if (!user?._id || !organizationId) return;

    try {
      await toggleVisibilityMutation({
        organizationId: organizationId,
        fileId: fileId,
      });
    } catch (error) {
      console.error("Error toggling file visibility:", error);
      alert("Error changing file visibility. Please try again.");
    }
  };

  if (filesData === undefined) {
    return (
      <div className="w-full bg-background font-mono text-xs">
        <FilesHeader 
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
        />
        <div className="p-3 text-muted-foreground text-xs">
          Loading files...
        </div>
      </div>
    );
  }

  const { publicFiles, privateFiles } = filesData;

  // Filter out plugins/data/ files from navigation
  const filteredPublicFiles = publicFiles.filter(file => !file.path.startsWith('plugins/data/'));
  const filteredPrivateFiles = privateFiles.filter(file => !file.path.startsWith('plugins/data/'));

  if (filteredPublicFiles.length === 0 && filteredPrivateFiles.length === 0 && pendingItems.length === 0) {
    return (
      <div className="w-full bg-background font-mono text-xs">
        <FilesHeader 
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
        />
        <div className="p-3 text-muted-foreground text-xs">
          No files found
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background font-mono text-xs">
      <FilesHeader 
        onCreateFile={handleCreateFile}
        onCreateFolder={handleCreateFolder}
      />
      
      {/* Private Files Section */}
      {(filteredPrivateFiles.length > 0 || pendingItems.some(item => !item.isPublic)) && (
        <FileGroupSection
          title="Private"
          files={filteredPrivateFiles}
          icon={<Lock className="h-3 w-3 text-muted-foreground/60" />}
          isPublic={false}
          pendingItems={pendingItems}
          onSavePending={handleSavePending}
          onCancelPending={handleCancelPending}
          onDelete={handleDelete}
          onRename={handleRename}
          onToggleVisibility={handleToggleVisibility}
          organizationId={organizationId}
        />
      )}
      
      {/* Public Files Section */}
      {(filteredPublicFiles.length > 0 || pendingItems.some(item => item.isPublic)) && (
        <FileGroupSection
          title="Public"
          files={filteredPublicFiles}
          icon={<Globe className="h-3 w-3 text-green-500" />}
          isPublic={true}
          pendingItems={pendingItems}
          onSavePending={handleSavePending}
          onCancelPending={handleCancelPending}
          onDelete={handleDelete}
          onRename={handleRename}
          onToggleVisibility={handleToggleVisibility}
          organizationId={organizationId}
        />
      )}
    </div>
  );
};