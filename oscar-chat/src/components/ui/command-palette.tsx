"use client";

import { useRef } from "react";
import { Search, Plus, GitBranch, FileText } from "lucide-react";

interface Command {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    keywords: string[];
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    selectedIndex: number;
    onSelectedIndexChange: (index: number) => void;
    onExecuteCommand: (commandId: string) => void;
    inputMode?: {
        placeholder: string;
        onSubmit: (value: string) => void;
        error?: string;
    };
}

const mockCommands: Command[] = [
    {
        id: "create-chat",
        title: "Create Chat",
        description: "Start a new conversation",
        icon: <Plus className="w-4 h-4" />,
        keywords: ["create", "new", "chat", "conversation", "start"]
    },
    {
        id: "create-blog",
        title: "Create Blog",
        description: "Write a new blog post",
        icon: <FileText className="w-4 h-4" />,
        keywords: ["create", "new", "blog", "post", "write"]
    },
    {
        id: "clone-repository",
        title: "Clone Repository",
        description: "Clone a GitHub repository",
        icon: <GitBranch className="w-4 h-4" />,
        keywords: ["clone", "git", "repository", "github", "repo"]
    },
    {
        id: "search-chat",
        title: "Search Chat",
        description: "Find existing conversations",
        icon: <Search className="w-4 h-4" />,
        keywords: ["search", "find", "chat", "conversation", "browse"]
    }
];

export function CommandPalette({ 
    isOpen, 
    onClose, 
    searchValue, 
    onSearchChange, 
    selectedIndex, 
    onSelectedIndexChange, 
    onExecuteCommand,
    inputMode
}: CommandPaletteProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter commands based on search
    const filteredCommands = mockCommands.filter(command => {
        const searchLower = searchValue.toLowerCase();
        return (
            command.title.toLowerCase().includes(searchLower) ||
            command.description.toLowerCase().includes(searchLower) ||
            command.keywords.some(keyword => keyword.includes(searchLower))
        );
    });

    // Note: selectedIndex is managed by parent component

    const executeCommand = (command: Command) => {
        onExecuteCommand(command.id);
    };

    if (!isOpen || (!inputMode && filteredCommands.length === 0)) return null;

    return (
        <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-0.5 rounded-sm shadow-lg z-50"
            style={{ 
                backgroundColor: 'var(--surface-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px'
            }}
        >
            {inputMode ? (
                /* Input Mode */
                <div className="px-2 py-1 font-mono">
                    <div 
                        className="text-xs mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {inputMode.placeholder}
                    </div>
                    {inputMode.error && (
                        <div 
                            className="text-xs mb-1"
                            style={{ color: 'var(--status-error)' }}
                        >
                            {inputMode.error}
                        </div>
                    )}
                    <div className="text-xs">
                        Press Enter to confirm, Escape to cancel
                    </div>
                </div>
            ) : (
                /* Commands List */
                <div className="max-h-32 overflow-y-auto">
                    {filteredCommands.map((command, index) => (
                        <div
                            key={command.id}
                            className="flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors font-mono"
                            style={{
                                backgroundColor: index === selectedIndex ? 'var(--interactive-hover)' : 'transparent',
                                color: 'var(--text-primary)',
                                lineHeight: '1.2'
                            }}
                            onClick={() => executeCommand(command)}
                            onMouseEnter={() => onSelectedIndexChange(index)}
                        >
                            <div style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0">
                                {command.icon}
                            </div>
                            <div className="flex-1 min-w-0 truncate">
                                {command.title}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}