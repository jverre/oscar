"use client";

import { ChevronDown, ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderNode } from "@/utils/folderUtils";

interface VisibilityFolderItemProps {
    folder: FolderNode;
    onToggleExpanded: (folderPath: string) => void;
    onFolderClick: (folderPath: string, event?: React.MouseEvent) => void;
    onFolderContextMenu: (e: React.MouseEvent, folderPath: string) => void;
    isSelected: boolean;
    onDrop?: (files: string[], targetVisibility: "public" | "private") => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
}

export function VisibilityFolderItem({
    folder,
    onToggleExpanded,
    onFolderClick,
    onFolderContextMenu,
    isSelected,
    onDrop,
    onDragOver,
    onDragLeave
}: VisibilityFolderItemProps) {
    const hasChildren = folder.children.size > 0 || folder.files.length > 0;
    // Visibility folders should always show chevron, even when empty
    const showChevron = hasChildren || folder.isVisibilityContainer;
    const isPublic = folder.visibility === "public";
    const Icon = isPublic ? Globe : null;

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpanded(folder.path);
    };

    const handleFolderClick = (e: React.MouseEvent) => {
        onFolderClick(folder.path, e);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        onFolderContextMenu(e, folder.path);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const draggedFiles = JSON.parse(e.dataTransfer.getData('application/json'));
        if (draggedFiles && onDrop && folder.visibility) {
            onDrop(draggedFiles, folder.visibility);
        }
        
        // Reset drag styles
        (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? 'var(--interactive-primary)' : 'transparent';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Visual feedback during drag
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--interactive-hover)';
        
        if (onDragOver) {
            onDragOver(e);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Reset visual feedback
        (e.currentTarget as HTMLElement).style.backgroundColor = isSelected ? 'var(--interactive-primary)' : 'transparent';
        
        if (onDragLeave) {
            onDragLeave(e);
        }
    };

    return (
        <div
            className={cn(
                "flex items-center h-[22px] text-[13px] cursor-pointer text-sidebar-foreground select-none relative",
                isSelected && "bg-sidebar-accent"
            )}
            style={{ 
                paddingLeft: '20px',
                paddingRight: '8px',
                backgroundColor: isSelected ? 'var(--interactive-primary)' : 'transparent',
                fontWeight: '600' // Make visibility folders bold to distinguish them
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
            onClick={handleFolderClick}
            onContextMenu={handleContextMenu}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <button
                onClick={handleToggleClick}
                className="absolute flex items-center justify-center"
                style={{ 
                    left: '4px',
                    width: '16px',
                    height: '22px',
                    backgroundColor: 'transparent'
                }}
            >
                {showChevron && (
                    folder.isExpanded ? (
                        <ChevronDown className="w-4 h-4" style={{ opacity: 0.6 }} />
                    ) : (
                        <ChevronRight className="w-4 h-4" style={{ opacity: 0.6 }} />
                    )
                )}
            </button>
            
            {Icon && <Icon className="w-4 h-4 mr-2" style={{ 
                opacity: 0.7,
                marginLeft: '4px',
                marginRight: '4px',
                color: 'var(--text-secondary)'
            }} />}
            
            <span className="truncate" style={{ 
                opacity: 0.9, 
                marginLeft: '4px',
                color: isSelected ? 'white' : 'inherit'
            }}>{folder.name}</span>
        </div>
    );
}