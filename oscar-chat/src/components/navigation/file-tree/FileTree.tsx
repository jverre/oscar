import React, { useState } from "react";
import { Lock, Globe } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useTenant } from "@/components/providers/TenantProvider";
import { FilesHeader } from "./FilesHeader";
import { FileGroupSection } from "./FileGroupSection";
import { LoadingPlaceholder } from "@/components/ui/loading";
import { Id } from "../../../../convex/_generated/dataModel";

export const FileTree = () => {
  const { organizationId, user } = useTenant();
  const createFileMutation = useMutation(api.files.createFile);
  const createFolderMutation = useMutation(api.files.createFolder);
  const deleteFileMutation = useMutation(api.files.deleteFile);
  const deleteFolderMutation = useMutation(api.files.deleteFolder);
  const renameFileMutation = useMutation(api.files.renameFile);
  const toggleVisibilityMutation = useMutation(api.files.toggleFileVisibility);
  const [creatingItem, setCreatingItem] = useState<{ type: 'file' | 'folder', isPublic: boolean } | null>(null);
  
  const filesData = useQuery(
    api.files.getFiles, 
    organizationId ? { organizationId } : "skip"
  );
  
  console.log('[FileTree] Files data:', filesData);

  const handleCreateFile = (isPublic: boolean = false) => {
    setCreatingItem({ type: 'file', isPublic });
  };

  const handleCreateFolder = (isPublic: boolean = false) => {
    setCreatingItem({ type: 'folder', isPublic });
  };

  const handleSaveCreating = async (name: string) => {
    if (!creatingItem || !user?._id || !organizationId) return;

    try {
      if (creatingItem.type === 'file') {
        const filePath = name.includes('.') ? name : `${name}.blog`;
        await createFileMutation({
          organizationId: organizationId,
          path: filePath,
          content: "",
          type: "user",
          isPublic: creatingItem.isPublic,
        });
      } else {
        await createFolderMutation({
          organizationId: organizationId,
          path: name,
          isPublic: creatingItem.isPublic,
        });
      }
      
      // Clear creating state
      setCreatingItem(null);
    } catch (error) {
      console.error("Error creating item:", error);
      alert("Error creating item. Please try again.");
    }
  };

  const handleCancelCreating = () => {
    setCreatingItem(null);
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
        <LoadingPlaceholder message="Loading files..." />
      </div>
    );
  }

  const { publicFiles, privateFiles } = filesData;

  // Filter out plugins/data/ files from navigation
  const filteredPublicFiles = publicFiles.filter(file => !file.path.startsWith('plugins/data/'));
  const filteredPrivateFiles = privateFiles.filter(file => !file.path.startsWith('plugins/data/'));

  if (filteredPublicFiles.length === 0 && filteredPrivateFiles.length === 0 && !creatingItem) {
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
      {(filteredPrivateFiles.length > 0 || (creatingItem && !creatingItem.isPublic)) && (
        <FileGroupSection
          title="Private"
          files={filteredPrivateFiles}
          icon={<Lock className="h-3 w-3 text-muted-foreground/60" />}
          isPublic={false}
          creatingItem={creatingItem && !creatingItem.isPublic ? creatingItem : null}
          onSaveCreating={handleSaveCreating}
          onCancelCreating={handleCancelCreating}
          onDelete={handleDelete}
          onRename={handleRename}
          onToggleVisibility={handleToggleVisibility}
          organizationId={organizationId}
        />
      )}
      
      {/* Public Files Section */}
      {(filteredPublicFiles.length > 0 || (creatingItem && creatingItem.isPublic)) && (
        <FileGroupSection
          title="Public"
          files={filteredPublicFiles}
          icon={<Globe className="h-3 w-3 text-green-500" />}
          isPublic={true}
          creatingItem={creatingItem && creatingItem.isPublic ? creatingItem : null}
          onSaveCreating={handleSaveCreating}
          onCancelCreating={handleCancelCreating}
          onDelete={handleDelete}
          onRename={handleRename}
          onToggleVisibility={handleToggleVisibility}
          organizationId={organizationId}
        />
      )}
    </div>
  );
};