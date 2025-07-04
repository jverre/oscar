"use client";

import { useState, memo } from "react";
import { cn } from "@/lib/utils";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { getFileDisplayName } from "@/utils/folderUtils";
import { validateFileName, areFileNamesDuplicate } from "@/utils/fileNameUtils";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Info, Globe, RotateCw } from "lucide-react";

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

const FileItem = memo(function FileItem({
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
    const [showTooltip, setShowTooltip] = useState(false);
    const [showDescriptionTooltip, setShowDescriptionTooltip] = useState(false);
    
    // Simple file name processing
    const lastDotIndex = displayName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0 && lastDotIndex < displayName.length - 1;
    const mainName = hasExtension ? displayName.substring(0, lastDotIndex) : displayName;
    const extension = hasExtension ? displayName.substring(lastDotIndex) : '';
    
    const maxMainNameLength = 15;
    const isTruncated = mainName.length > maxMainNameLength;
    const truncatedMainName = isTruncated 
        ? mainName.substring(0, maxMainNameLength) + '[...]'
        : mainName;

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
                "h-[22px] flex items-center text-[13px] cursor-pointer text-sidebar-foreground select-none",
                (isActive || isSelected) && "bg-sidebar-accent"
            )}
            style={{ 
                paddingLeft: `${12 + indentLevel}px`,
                paddingRight: '8px', // Add right padding so extension isn't stuck to sidebar
                backgroundColor: isSelected 
                    ? 'var(--interactive-hover)'
                    : isActive 
                    ? 'var(--interactive-primary)'
                    : 'transparent',
                touchAction: 'manipulation' // Disable 300ms click delay on mobile
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
            <div 
                className="flex items-center min-w-0 w-full relative"
                style={{ 
                    opacity: 1,
                    color: (isActive || isSelected) ? 'white' : 'inherit'
                }}
            >
                <span 
                    className="whitespace-nowrap flex-1 min-w-0"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    {truncatedMainName}
                    {extension}
                </span>
                
                {/* Title regeneration indicator */}
                {file.isRegeneratingTitle && (
                    <div title="Regenerating title...">
                        <RotateCw 
                            className="h-3 w-3 flex-shrink-0 ml-1 opacity-70 animate-spin"
                            style={{ color: 'var(--text-secondary)' }}
                        />
                    </div>
                )}
                
                {/* Visibility indicator */}
                {file.visibility === "public" && (
                    <div title="Public file">
                        <Globe 
                            className="h-3 w-3 flex-shrink-0 ml-1 opacity-50"
                            style={{ color: 'var(--text-secondary)' }}
                        />
                    </div>
                )}
                
                {/* Description info icon */}
                {file.metadata?.sessionSummary && (
                    <Info 
                        className="h-3 w-3 flex-shrink-0 ml-1 opacity-50 hover:opacity-100 transition-opacity"
                        onMouseEnter={() => setShowDescriptionTooltip(true)}
                        onMouseLeave={() => setShowDescriptionTooltip(false)}
                        style={{ color: 'inherit' }}
                    />
                )}
                
                {/* Custom filename tooltip */}
                {showTooltip && isTruncated && (
                    <div
                        className="absolute bottom-full mb-2 right-0 z-50 pointer-events-none"
                        style={{
                            background: 'var(--surface-secondary)',
                            color: 'var(--text-primary)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '300px',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            animation: 'fadeIn 0.1s ease-out'
                        }}
                    >
                        {displayName}
                    </div>
                )}
                
                {/* Description tooltip */}
                {showDescriptionTooltip && file.metadata?.sessionSummary && (
                    <div
                        className="absolute bottom-full mb-2 right-0 z-50 pointer-events-none"
                        style={{
                            background: 'var(--surface-secondary)',
                            color: 'var(--text-primary)',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '350px',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                            animation: 'fadeIn 0.1s ease-out'
                        }}
                    >
                        {file.metadata.sessionSummary}
                    </div>
                )}
            </div>
        </div>
    );
});

export { FileItem };