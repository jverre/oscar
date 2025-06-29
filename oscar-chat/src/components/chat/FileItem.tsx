"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { getFileDisplayName } from "@/utils/folderUtils";
import { validateFileName, areFileNamesDuplicate } from "@/utils/fileNameUtils";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface FileItemProps {
    file: Doc<"files">;
    level: number;
    isActive: boolean;
    isSelected: boolean;
    onFileClick: (fileId: string, event?: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent, fileId: string) => void;
    renamingId: string | null;
    renameValue: string;
    onRenameValueChange: (value: string) => void;
    onRenameSubmit: (fileId: string) => void;
    onRenameCancel: () => void;
    renameError: string | null;
    onRenameErrorChange: (error: string | null) => void;
    files: Doc<"files">[] | undefined;
}

export function FileItem({
    file,
    level,
    isActive,
    isSelected,
    onFileClick,
    onContextMenu,
    renamingId,
    renameValue,
    onRenameValueChange,
    onRenameSubmit,
    onRenameCancel,
    renameError,
    onRenameErrorChange,
    files
}: FileItemProps) {
    const updateName = useMutation(api.files.updateName);
    const displayName = getFileDisplayName(file);
    const indentLevel = level * 16;

    const handleRenameSubmit = async () => {
        const trimmedName = renameValue.trim();
        
        if (!trimmedName) {
            onRenameErrorChange("File name cannot be empty");
            return;
        }
        
        // Validate the file name
        const validationError = validateFileName(trimmedName);
        if (validationError) {
            onRenameErrorChange(validationError);
            return;
        }
        
        // Check for duplicates (excluding the current file)
        if (files) {
            const otherFiles = files.filter(f => f._id !== file._id);
            const isDuplicate = otherFiles.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
            
            if (isDuplicate) {
                onRenameErrorChange(`A file named "${trimmedName}" already exists. Please choose a different name.`);
                return;
            }
        }
        
        try {
            await updateName({
                fileId: file._id as Id<"files">,
                name: trimmedName,
            });
            
            onRenameSubmit(file._id);
        } catch (error) {
            console.error("Failed to rename file:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to rename file";
            onRenameErrorChange(errorMessage);
        }
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleRenameSubmit();
        } else if (e.key === "Escape") {
            onRenameCancel();
        }
    };

    const handleRenameBlur = () => {
        if (renameError) {
            onRenameCancel();
        } else {
            handleRenameSubmit();
        }
    };

    const handleRenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onRenameValueChange(e.target.value);
        if (renameError) onRenameErrorChange(null);
    };

    if (renamingId === file._id) {
        return (
            <div className="relative">
                <div 
                    className="h-[22px] flex items-center"
                    style={{ paddingLeft: `${20 + indentLevel}px` }}
                >
                    <input
                        type="text"
                        value={renameValue}
                        onChange={handleRenameChange}
                        onBlur={handleRenameBlur}
                        onKeyDown={handleRenameKeyDown}
                        onFocus={(e) => {
                            const lastDotIndex = renameValue.lastIndexOf('.');
                            if (lastDotIndex > 0) {
                                e.target.setSelectionRange(0, lastDotIndex);
                            } else {
                                e.target.select();
                            }
                        }}
                        className={cn(
                            "w-full h-[20px] text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none",
                            renameError && "border border-red-500"
                        )}
                        style={{
                            boxShadow: renameError 
                                ? 'inset 0 1px 0 0 var(--status-error), inset 0 -1px 0 0 var(--status-error)'
                                : 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
                        }}
                        autoFocus
                    />
                </div>
                {renameError && (
                    <div 
                        className="absolute z-10 px-2 py-1 text-xs text-white bg-red-600 rounded shadow-lg max-w-64 break-words"
                        style={{ 
                            left: `${20 + indentLevel}px`,
                            top: '24px'
                        }}
                    >
                        {renameError}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={(e) => onFileClick(file._id, e)}
            onContextMenu={(e) => onContextMenu(e, file._id)}
            className={cn(
                "h-[22px] flex items-center text-[13px] cursor-pointer text-sidebar-foreground truncate select-none",
                (isActive || isSelected) && "bg-sidebar-accent"
            )}
            style={{ 
                paddingLeft: `${20 + indentLevel}px`,
                backgroundColor: isSelected 
                    ? 'var(--interactive-hover)'
                    : isActive 
                    ? 'var(--interactive-primary)'
                    : 'transparent'
            }}
            onMouseEnter={(e) => {
                if (!isActive && !isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive && !isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
        >
            <span style={{ 
                opacity: 0.8,
                color: (isActive || isSelected) ? 'white' : 'inherit'
            }}>{displayName}</span>
        </div>
    );
}