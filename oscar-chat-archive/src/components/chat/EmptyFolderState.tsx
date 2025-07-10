"use client";

interface EmptyFolderStateProps {
    folderName: string;
    level: number;
}

export function EmptyFolderState({ folderName, level }: EmptyFolderStateProps) {
    const indentLevel = level * 8;
    
    return (
        <div
            className="flex items-center h-[22px] text-[13px] text-sidebar-foreground select-none"
            style={{ 
                paddingLeft: `${16 + indentLevel + 16}px`, // Extra indent for empty state
                paddingRight: '8px',
                opacity: 0.5,
                fontStyle: 'italic'
            }}
        >
            No files found
        </div>
    );
}