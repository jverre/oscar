"use client";

import { X } from "lucide-react";
import { useTabContext } from "@/contexts/TabContext";
import type { Id } from "../../../convex/_generated/dataModel";
import { forwardRef, useState } from "react";

interface TabItemProps {
  tabId: string;
  conversationId?: Id<"conversations">;
  title: string;
  isActive: boolean;
  tabCount: number;
  index: number;
}

export const TabItem = forwardRef<HTMLDivElement, TabItemProps>(({ tabId, title, isActive, tabCount, index }, ref) => {
  const { switchToTab, closeTab, reorderTabs } = useTabContext();
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<'left' | 'right' | null>(null);
  const [showDropIndicator, setShowDropIndicator] = useState(false);

  // Use a very small fixed width for tabs
  const tabWidth = 120; // Very small fixed width

  const handleClick = () => {
    if (!isActive) {
      switchToTab(tabId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent text selection on drag, but allow normal click
    if (e.detail > 1) {
      e.preventDefault();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image that looks like VS Code
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.opacity = '0.5';
    dragImage.style.transform = 'none';
    dragImage.style.backgroundColor = 'var(--surface-secondary)';
    dragImage.style.border = '1px solid var(--border-subtle)';
    dragImage.style.borderRadius = '4px';
    dragImage.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    dragImage.style.width = `${tabWidth}px`;
    dragImage.style.height = '32px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    
    // Clean up drag image after drag starts
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setShowDropIndicator(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only show indicators if we're actually dragging a tab
    if (e.dataTransfer.types.includes('text/plain')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      const newPosition = e.clientX < midpoint ? 'left' : 'right';
      
      setIsDragOver(true);
      setDragPosition(newPosition);
      setShowDropIndicator(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag state if we're leaving the tab entirely
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || 
        e.clientY < rect.top || e.clientY > rect.bottom) {
      setIsDragOver(false);
      setDragPosition(null);
      setShowDropIndicator(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragPosition(null);
    setShowDropIndicator(false);
    
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === index) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const dropPosition = e.clientX < midpoint ? 'left' : 'right';
    
    let destinationIndex = index;
    if (dropPosition === 'right') {
      destinationIndex = sourceIndex < index ? index : index + 1;
    } else {
      destinationIndex = sourceIndex < index ? index - 1 : index;
    }
    
    reorderTabs(sourceIndex, destinationIndex);
  };

  return (
    <div
      ref={ref}
      draggable="true"
      className={`
        flex items-center group cursor-pointer relative flex-shrink-0 h-full
        transition-all duration-150 ease-in-out select-none
        ${isActive 
          ? '' 
          : 'hover:text-foreground'
        }
        ${isDragging ? 'opacity-30' : ''}
      `}
      onMouseEnter={(e) => {
        if (!isActive && !isDragging) {
          e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive && !isDragging) {
          e.currentTarget.style.backgroundColor = 'var(--sidebar)';
        }
      }}
      style={{ 
        borderRight: '1px solid var(--border-subtle)',
        maxWidth: `${tabWidth}px`,
        backgroundColor: isActive ? 'var(--background)' : 'var(--sidebar)',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        position: 'relative'
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* VS Code-style drop indicator */}
      {showDropIndicator && dragPosition === 'left' && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.5 z-50"
          style={{ 
            backgroundColor: 'var(--text-primary)',
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)'
          }}
        />
      )}
      {showDropIndicator && dragPosition === 'right' && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-0.5 z-50"
          style={{ 
            backgroundColor: 'var(--text-primary)',
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)'
          }}
        />
      )}
      
      {/* Tab content */}
      <div className="flex items-center flex-1 min-w-0 px-3 py-2 text-sm">
        {/* Title with ellipsis */}
        <span 
          className="truncate flex-1 text-xs"
          title={title}
        >
          {title}
        </span>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            ml-1 p-0.5 transition-colors flex-shrink-0 rounded
            ${isActive ? 'text-muted-foreground hover:text-foreground' : 'opacity-0 group-hover:opacity-100'}
          `}
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label={`Close ${title}`}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
});

TabItem.displayName = 'TabItem';