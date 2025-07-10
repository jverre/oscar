import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function useFileOperations() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const updateName = useMutation(api.files.updateName);
  const updateVisibility = useMutation(api.files.updateVisibility);
  const deleteFile = useMutation(api.files.remove);
  const regenerateTitle = useMutation(api.files.regenerateTitle);
  
  const renameFile = async (fileId: Id<"files">, newName: string) => {
    setIsUpdating(true);
    try {
      await updateName({ fileId, name: newName });
      return { success: true };
    } catch (error) {
      console.error("Failed to rename file:", error);
      return { success: false, error };
    } finally {
      setIsUpdating(false);
    }
  };
  
  const deleteFiles = async (fileIds: Id<"files">[]) => {
    setIsDeleting(true);
    try {
      await Promise.all(fileIds.map(fileId => deleteFile({ fileId })));
      return { success: true };
    } catch (error) {
      console.error("Failed to delete files:", error);
      return { success: false, error };
    } finally {
      setIsDeleting(false);
    }
  };
  
  const toggleVisibility = async (fileId: Id<"files">, visibility: "public" | "private") => {
    setIsUpdating(true);
    try {
      await updateVisibility({ fileId, visibility });
      return { success: true };
    } catch (error) {
      console.error("Failed to update visibility:", error);
      return { success: false, error };
    } finally {
      setIsUpdating(false);
    }
  };
  
  const regenerateFileTitle = async (fileId: Id<"files">) => {
    setIsUpdating(true);
    try {
      await regenerateTitle({ fileId });
      return { success: true };
    } catch (error) {
      console.error("Failed to regenerate title:", error);
      return { success: false, error };
    } finally {
      setIsUpdating(false);
    }
  };
  
  return {
    renameFile,
    deleteFiles,
    toggleVisibility,
    regenerateFileTitle,
    isDeleting,
    isUpdating,
  };
}