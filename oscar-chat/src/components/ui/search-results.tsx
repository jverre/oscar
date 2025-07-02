"use client";

import { useRef } from "react";
import { FileText, MessageSquare, Clock } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface SearchResult {
    type: "file" | "message";
    id: string;
    title: string;
    subtitle: string;
    timestamp: number;
    fileId?: Id<"files">;
    fileName?: string;
}

interface SearchResultsProps {
    isOpen: boolean;
    searchValue: string;
    results: SearchResult[];
    selectedIndex: number;
    onSelectedIndexChange: (index: number) => void;
    onSelectResult: (result: SearchResult) => void;
    isLoading?: boolean;
}

export function SearchResults({ 
    isOpen, 
    searchValue, 
    results,
    selectedIndex, 
    onSelectedIndexChange, 
    onSelectResult,
    isLoading = false
}: SearchResultsProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 7) {
            return date.toLocaleDateString();
        } else if (diffDays > 0) {
            return `${diffDays}d ago`;
        } else if (diffHours > 0) {
            return `${diffHours}h ago`;
        } else {
            return "Recently";
        }
    };

    const highlightMatch = (text: string, searchTerm: string) => {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => 
            regex.test(part) ? (
                <span key={index} style={{ backgroundColor: 'var(--status-warning)', color: 'var(--surface-primary)' }}>
                    {part}
                </span>
            ) : part
        );
    };

    if (!isOpen) return null;

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
            {isLoading ? (
                <div className="px-3 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                    Searching...
                </div>
            ) : results.length === 0 ? (
                <div className="px-3 py-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {searchValue ? 'No results found' : 'Start typing to search...'}
                </div>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    {results.map((result, index) => (
                        <div
                            key={`${result.type}-${result.id}`}
                            className="flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors font-mono border-b border-opacity-20"
                            style={{
                                backgroundColor: index === selectedIndex ? 'var(--interactive-hover)' : 'transparent',
                                color: 'var(--text-primary)',
                                borderColor: 'var(--border-subtle)',
                                lineHeight: '1.3'
                            }}
                            onClick={() => onSelectResult(result)}
                            onMouseEnter={() => onSelectedIndexChange(index)}
                        >
                            <div style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0 mt-0.5">
                                {result.type === 'file' ? (
                                    <FileText className="w-3 h-3" />
                                ) : (
                                    <MessageSquare className="w-3 h-3" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium truncate">
                                        {highlightMatch(result.title, searchValue)}
                                    </div>
                                    <div 
                                        className="flex items-center gap-1 text-xs flex-shrink-0"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatTimestamp(result.timestamp)}
                                    </div>
                                </div>
                                {result.subtitle && (
                                    <div 
                                        className="text-xs truncate mt-0.5"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        {result.type === 'message' && result.fileName && (
                                            <span>in {result.fileName} • </span>
                                        )}
                                        {highlightMatch(result.subtitle, searchValue)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}