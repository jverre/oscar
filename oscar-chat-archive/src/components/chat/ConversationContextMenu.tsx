"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ConversationContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenAll?: () => void;
  isMultipleSelected?: boolean;
  isFolder?: boolean;
}

export function ConversationContextMenu({
  x,
  y,
  onClose,
  onOpen,
  onRename,
  onDelete,
  onOpenAll,
  isMultipleSelected = false,
  isFolder = false,
}: ConversationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to ensure menu stays within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }

      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = isMultipleSelected 
    ? [
        { label: "Open All", action: onOpenAll || (() => {}) },
        { type: "separator" as const },
        { label: "Delete", action: onDelete, className: "hover:text-foreground", style: { color: 'var(--status-error)' } },
      ]
    : isFolder
    ? [
        { label: "Open All", action: onOpenAll || (() => {}) },
        { label: "Rename", action: onRename },
        { type: "separator" as const },
        { label: "Delete", action: onDelete, className: "hover:text-foreground", style: { color: 'var(--status-error)' } },
      ]
    : [
        { label: "Open", action: onOpen },
        { label: "Rename", action: onRename },
        { type: "separator" as const },
        { label: "Delete", action: onDelete, className: "hover:text-foreground", style: { color: 'var(--status-error)' } },
      ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-0.5"
      style={{ 
        left: x, 
        top: y,
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '3px',
        boxShadow: '0 2px 8px var(--shadow-menu)'
      }}
    >
      {menuItems.map((item, index) => {
        if (item.type === "separator") {
          return (
            <div
              key={index}
              className="h-px mx-0 my-0.5"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            />
          );
        }

        return (
          <button
            key={index}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={cn(
              "w-full px-2 py-1 text-left text-xs transition-colors",
              item.className
            )}
            style={{
              backgroundColor: 'transparent',
              color: item.style?.color || 'var(--text-primary)',
              border: 'none',
              outline: 'none',
              ...item.style
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}