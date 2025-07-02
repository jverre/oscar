'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

interface ToolCallProps {
    name: string;
    id: string;
    children: React.ReactNode;
    result?: string;
    defaultOpen?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
    isError?: boolean;
}

export function ToolCall({ 
    name, 
    id, 
    children, 
    result, 
    defaultOpen = false, 
    isExpanded, 
    onToggle, 
    isError = false 
}: ToolCallProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
    
    // Use external control if provided, otherwise use internal state
    const isOpen = isExpanded !== undefined ? isExpanded : internalIsOpen;
    const handleToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));

    return (
        <div className="my-1 border rounded overflow-hidden" style={{ 
            borderColor: 'var(--border-subtle)',
            fontSize: '12px',
            width: isOpen ? '80%' : '30%',
            minWidth: '200px',
            maxWidth: isOpen ? '800px' : '400px',
            transition: 'width 0.2s ease-in-out, max-width 0.2s ease-in-out'
        }}>
            <Collapsible open={isOpen} onOpenChange={handleToggle}>
                <CollapsibleTrigger 
                    className="w-full px-2 py-1 transition-colors duration-200 flex items-center gap-2 text-left"
                    style={{ 
                        backgroundColor: 'var(--surface-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        lineHeight: '18px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                    }}
                >
                    {isOpen ? (
                        <ChevronDown className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                    ) : (
                        <ChevronRight className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                    )}
                    <Wrench className="h-3 w-3" style={{ color: isError ? 'var(--status-error)' : 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{name}</span>
                    {isError && (
                        <span style={{ color: 'var(--status-error)', fontSize: '10px', marginLeft: 'auto' }}>
                            ⚠ Error
                        </span>
                    )}
                </CollapsibleTrigger>
                <CollapsibleContent 
                    className="border-t"
                    style={{ 
                        backgroundColor: 'var(--surface-primary)',
                        borderColor: 'var(--border-subtle)'
                    }}
                >
                    <div className="px-2 py-1">
                        <div className="mb-1">
                            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Tool Call:</div>
                            <div className="text-xs" style={{ 
                                backgroundColor: 'var(--surface-secondary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '8px',
                                overflowX: 'auto'
                            }}>
                                <pre className="text-xs" style={{ 
                                    color: 'var(--text-primary)',
                                    fontSize: '11px',
                                    lineHeight: '14px',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace'
                                }}>
                                    <code>{children}</code>
                                </pre>
                            </div>
                        </div>
                        {result && (
                            <div className="mt-1">
                                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Tool Result:</div>
                                <div className="text-xs" style={{ 
                                    backgroundColor: 'var(--surface-secondary)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    overflowX: 'auto'
                                }}>
                                    <pre className="text-xs" style={{ 
                                        color: 'var(--text-primary)',
                                        fontSize: '11px',
                                        lineHeight: '14px',
                                        margin: 0,
                                        whiteSpace: 'pre',
                                        fontFamily: 'monospace'
                                    }}>
                                        <code>{
                                            // Handle legacy content that might have markers and escaped newlines
                                            result
                                                .replace(/:::tool-result\{[^}]*\}\n?/g, '')
                                                .replace(/\n?:::/g, '')
                                                .replace(/\\n/g, '\n')
                                                .replace(/\\t/g, '\t')
                                                .trim()
                                        }</code>
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

