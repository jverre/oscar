"use client";

import { useRef, useEffect } from "react";

export interface CommandDropdownItem {
    id: string;
    title: string;
    icon?: React.ReactNode;
    onClick?: () => void;
}

interface CommandDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    items: CommandDropdownItem[];
    selectedIndex?: number;
    onSelectedIndexChange?: (index: number) => void;
    position: { top: number; left: number };
    className?: string;
}

export function CommandDropdown({
    isOpen,
    onClose,
    items,
    selectedIndex = -1,
    onSelectedIndexChange,
    position,
    className = ""
}: CommandDropdownProps) {
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
            className={`fixed z-50 rounded-sm shadow-lg ${className}`}
            style={{ 
                top: position.top,
                left: position.left,
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                minWidth: '200px'
            }}
        >
            <div className="max-h-32 overflow-y-auto">
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors font-mono"
                        style={{
                            backgroundColor: index === selectedIndex ? 'var(--interactive-hover)' : 'transparent',
                            color: 'var(--text-primary)',
                            lineHeight: '1.2'
                        }}
                        onClick={() => {
                            item.onClick?.();
                            onClose();
                        }}
                        onMouseEnter={() => onSelectedIndexChange?.(index)}
                    >
                        {item.icon && (
                            <div style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0">
                                {item.icon}
                            </div>
                        )}
                        <div className="flex-1 min-w-0 truncate">
                            {item.title}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}