"use client";

import { X } from "lucide-react";
import { useTabContext } from "@/contexts/TabContext";
import type { Id } from "../../../convex/_generated/dataModel";
import { forwardRef } from "react";

interface TabItemProps {
  tabId: string;
  conversationId?: Id<"conversations">;
  title: string;
  isActive: boolean;
  tabCount: number;
}

export const TabItem = forwardRef<HTMLDivElement, TabItemProps>(({ tabId, title, isActive, tabCount }, ref) => {
  const { switchToTab, closeTab } = useTabContext();

  // Use a very small fixed width for tabs
  const tabWidth = 120; // Very small fixed width

  const handleClick = () => {
    if (!isActive) {
      switchToTab(tabId);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  return (
    <div
      ref={ref}
      className={`
        flex items-center group cursor-pointer relative flex-shrink-0 h-full
        transition-colors duration-150
        ${isActive 
          ? '' 
          : 'hover:text-foreground'
        }
      `}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--surface-muted)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--sidebar)';
        }
      }}
      style={{ 
        borderRight: '1px solid var(--border-subtle)', 
        maxWidth: `${tabWidth}px`,
        backgroundColor: isActive ? 'var(--background)' : 'var(--sidebar)',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
      }}
      onClick={handleClick}
    >
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
            ml-1 p-0.5 transition-colors flex-shrink-0
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