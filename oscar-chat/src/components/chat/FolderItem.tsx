"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderNode } from "@/utils/folderUtils";

interface FolderItemProps {
    folder: FolderNode;
    level: number;
    onToggleExpanded: (folderPath: string) => void;
    onFolderClick: (folderPath: string, event?: React.MouseEvent) => void;
    onFolderContextMenu: (e: React.MouseEvent, folderPath: string) => void;
    isSelected: boolean;
}

export function FolderItem({
    folder,
    level,
    onToggleExpanded,
    onFolderClick,
    onFolderContextMenu,
    isSelected
}: FolderItemProps) {
    const hasChildren = folder.children.size > 0 || folder.files.length > 0 || folder.isGitRepo;
    const indentLevel = level * 8; // Condensed indentation like VS Code

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

    return (
        <div
            className={cn(
                "flex items-center h-[22px] text-[13px] cursor-pointer text-sidebar-foreground select-none relative",
                isSelected && "bg-sidebar-accent"
            )}
            style={{ 
                paddingLeft: `${16 + indentLevel}px`,
                paddingRight: '8px',
                backgroundColor: isSelected ? 'var(--interactive-primary)' : 'transparent'
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
        >
            <button
                onClick={handleToggleClick}
                className="absolute flex items-center justify-center"
                style={{ 
                    left: `${12 + indentLevel}px`,
                    width: '16px',
                    height: '22px',
                    backgroundColor: 'transparent'
                }}
            >
                {hasChildren && (
                    folder.isExpanded ? (
                        <ChevronDown className="w-4 h-4" style={{ opacity: 0.6 }} />
                    ) : (
                        <ChevronRight className="w-4 h-4" style={{ opacity: 0.6 }} />
                    )
                )}
            </button>
            
            <span className="truncate" style={{ 
                opacity: 0.8, 
                marginLeft: '12px',
                color: isSelected ? 'white' : 'inherit'
            }}>{folder.name}</span>
        </div>
    );
}