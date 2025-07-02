import React, { useState } from 'react';
import { ToolCall } from '../ui/tool-call';
import { normalizeContent, type StructuredContent } from '@/utils/contentUtils';

interface ToolInteraction {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
  isError?: boolean;
}

interface ToolInteractionGroupProps {
  interactions: ToolInteraction[];
  className?: string;
}

export function ToolInteractionGroup({ interactions, className = '' }: ToolInteractionGroupProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (toolCallId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolCallId)) {
      newExpanded.delete(toolCallId);
    } else {
      newExpanded.add(toolCallId);
    }
    setExpandedTools(newExpanded);
  };

  if (interactions.length === 0) return null;

  return (
    <div className={`tool-interaction-group ${className}`}>
      {/* Group header */}
      <div 
        className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:opacity-80"
        style={{ 
          color: 'var(--text-secondary)',
          marginBottom: '2px' // Minimal margin when collapsed
        }}
        onClick={() => {
          // Toggle all tools at once
          const allToolIds = interactions.map(i => i.toolCallId);
          const allExpanded = allToolIds.every(id => expandedTools.has(id));
          
          if (allExpanded) {
            // Collapse all
            setExpandedTools(new Set());
          } else {
            // Expand all
            setExpandedTools(new Set(allToolIds));
          }
        }}
      >
        <span>🔧</span>
        <span>
          {interactions.length === 1 
            ? `${interactions[0].toolName}` 
            : `${interactions.length} Tools Used`
          }
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
          (click to {interactions.every(i => expandedTools.has(i.toolCallId)) ? 'collapse' : 'expand'})
        </span>
      </div>

      {/* Show content only when expanded */}
      {interactions.some(i => expandedTools.has(i.toolCallId)) && (
        <div className="space-y-1 mt-2">
          {interactions.map((interaction) => (
            <div key={interaction.toolCallId} className="ml-4">
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Tool: {interaction.toolName}
              </div>
              <div 
                className="rounded text-xs font-mono"
                style={{ 
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  padding: '6px', // Reduced padding
                  overflowX: 'auto', // Allow horizontal scrolling
                  maxWidth: '100%' // Ensure it doesn't exceed container width
                }}
              >
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Arguments:</strong>
                  <pre style={{ 
                    color: 'var(--text-primary)', 
                    margin: '2px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}>
                    {JSON.stringify(interaction.args, null, 2)}
                  </pre>
                </div>
                {interaction.result && (
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Result:</strong>
                    <pre style={{ 
                      color: 'var(--text-primary)', 
                      margin: '2px 0 0 0',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      {typeof interaction.result === 'string' ? interaction.result : JSON.stringify(interaction.result, null, 2)}
                    </pre>
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

// Helper function to extract tool interactions from messages
export function extractToolInteractions(messages: Array<{
  content: StructuredContent;
  role: string;
}>): ToolInteraction[] {
  const toolCallsMap = new Map<string, Omit<ToolInteraction, 'result' | 'isError'>>();
  const toolResultsMap = new Map<string, { result: any; isError?: boolean }>();

  // First pass: collect all tool calls and results from all messages
  messages.forEach(message => {
    const normalizedContent = normalizeContent(message.content);
    
    normalizedContent.forEach(part => {
      // Tool calls come from assistant messages
      if (part.type === 'tool-call' && part.toolCallId && part.toolName && message.role === 'assistant') {
        toolCallsMap.set(part.toolCallId, {
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          args: part.args || {}
        });
      } 
      // Tool results can come from tool messages (role: "tool") OR user messages (temporary)
      else if (part.type === 'tool-result' && part.toolCallId && (message.role === 'tool' || message.role === 'user')) {
        toolResultsMap.set(part.toolCallId, {
          result: part.result,
          isError: part.isError
        });
      }
    });
  });

  // Second pass: combine tool calls with their results
  const interactions: ToolInteraction[] = [];
  
  toolCallsMap.forEach((toolCall, toolCallId) => {
    const result = toolResultsMap.get(toolCallId);
    
    interactions.push({
      ...toolCall,
      result: result?.result,
      isError: result?.isError
    });
  });

  // Sort by tool call ID to maintain consistent order
  return interactions.sort((a, b) => a.toolCallId.localeCompare(b.toolCallId));
}