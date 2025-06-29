"use client";

import { useRef, useEffect } from "react";

export interface DropdownItem {
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    destructive?: boolean;
}

interface DropdownProps {
    isOpen: boolean;
    onClose: () => void;
    items: DropdownItem[];
    selectedIndex?: number;
    onSelectedIndexChange?: (index: number) => void;
    position: { top: number; left: number };
    className?: string;
    minWidth?: number;
}

export function Dropdown({
    isOpen,
    onClose,
    items,
    selectedIndex = -1,
    onSelectedIndexChange,
    position,
    className = "",
    minWidth = 200
}: DropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className={`fixed z-50 ${className}`}
            style={{
                top: position.top,
                left: position.left,
                backgroundColor: '#1a1a1a',
                border: '1px solid var(--border-primary)',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                minWidth: `${minWidth}px`,
                overflow: 'hidden',
            }}
        >
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                    style={{
                        backgroundColor: index === selectedIndex 
                            ? 'var(--interactive-hover)' 
                            : 'transparent',
                        color: item.destructive 
                            ? 'var(--status-error)' 
                            : 'var(--text-primary)',
                        borderBottom: index < items.length - 1 
                            ? '1px solid var(--border-subtle)' 
                            : 'none',
                    }}
                    onClick={() => {
                        item.onClick?.();
                        onClose();
                    }}
                    onMouseEnter={() => onSelectedIndexChange?.(index)}
                >
                    {item.icon && (
                        <div 
                            className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                            style={{ 
                                color: item.destructive 
                                    ? 'var(--status-error)' 
                                    : 'var(--text-secondary)' 
                            }}
                        >
                            {item.icon}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                            {item.title}
                        </div>
                        {item.description && (
                            <div 
                                className="text-xs truncate mt-0.5"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {item.description}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}