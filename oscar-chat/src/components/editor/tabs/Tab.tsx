"use client";

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileContext } from '@/components/providers/FileProvider';

interface TabProps {
  filePath: string;
  fileName: string;
  isActive: boolean;
  type: 'user' | 'plugin';
  onClose: (filePath: string) => void;
}

export const Tab = ({ filePath, fileName, isActive, type, onClose }: TabProps) => {
  const { openFile } = useFileContext();

  const handleClick = () => {
    openFile(filePath, fileName, type);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(filePath);
  };

  return (
    <div
      className={cn(
        "flex items-center px-3 text-xs cursor-pointer select-none group relative",
        "border-r border-sidebar-border bg-sidebar transition-colors duration-150",
        isActive 
          ? "bg-background text-foreground" 
          : "text-sidebar-foreground hover:bg-sidebar-accent-hover"
      )}
      onClick={handleClick}
    >
      {/* Active tab indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      )}
      {/* File name */}
      <span className="truncate max-w-32 mr-1">
        {fileName}
      </span>
      
      {/* Close button */}
      <button
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-sm",
          "opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent-hover",
          "transition-opacity duration-150",
          isActive && "opacity-100"
        )}
        onClick={handleClose}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}; 