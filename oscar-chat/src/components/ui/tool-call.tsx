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
}

export function ToolCall({ name, id, children, result, defaultOpen = false }: ToolCallProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="my-2 border rounded overflow-hidden" style={{ 
            borderColor: 'var(--border-subtle)',
            fontSize: '12px',
            width: isOpen ? '80%' : '30%',
            minWidth: '200px',
            maxWidth: isOpen ? '800px' : '400px',
            transition: 'width 0.2s ease-in-out, max-width 0.2s ease-in-out'
        }}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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
                    <Wrench className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>{name}</span>
                </CollapsibleTrigger>
                <CollapsibleContent 
                    className="border-t"
                    style={{ 
                        backgroundColor: 'var(--surface-primary)',
                        borderColor: 'var(--border-subtle)'
                    }}
                >
                    <div className="px-2 py-2">
                        <div className="mb-2">
                            <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Tool Call:</div>
                            <pre className="text-xs overflow-x-auto" style={{ 
                                color: 'var(--text-primary)',
                                fontSize: '11px',
                                lineHeight: '14px',
                                margin: 0
                            }}>
                                <code>{children}</code>
                            </pre>
                        </div>
                        {result && (
                            <div>
                                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Tool Result:</div>
                                <div className="text-xs whitespace-pre-wrap" style={{ 
                                    color: 'var(--text-primary)',
                                    fontSize: '11px',
                                    lineHeight: '14px'
                                }}>
                                    {result}
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

