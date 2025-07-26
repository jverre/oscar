import { useState } from "react";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

export const COLORS = {
  muted: 'hsl(0 0% 65%)',
  mutedLight: 'hsl(0 0% 55%)',
  mutedLighter: 'hsl(0 0% 70%)',
} as const;

export const LIMITS = {
  maxOutputHeight: 200,
  contentTruncateLength: 500,
} as const;

export const TOOL_CONFIG = {
  list_files: { icon: '📁', name: 'List Files' },
  read_file: { icon: '📄', name: 'Read File' },
  write_file: { icon: '✏️', name: 'Write File' },
  execute_command: { icon: '⚡', name: 'Execute Command' },
  test_tool: { icon: '🧪', name: 'Test Tool' },
  create_snapshot: { icon: '📸', name: 'Create Snapshot' },
  update_sandbox_configuration: { icon: '⚙️', name: 'Update Configuration' },
  start_service: { icon: '🚀', name: 'Start Service' },
} as const;

export type ToolName = keyof typeof TOOL_CONFIG;

interface ToolInvocationProps {
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args?: any;
    state: 'partial-call' | 'call' | 'result';
    result?: any;
    timestamp?: number;
  };
}

export function ToolInvocationComponent({ toolInvocation }: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getToolConfig = (toolName: string) => {
    const config = TOOL_CONFIG[toolName as ToolName];
    if (config) return config;
    
    return {
      icon: '🔧',
      name: toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    };
  };

  const isComplete = toolInvocation.state === 'result';
  const isSuccess = isComplete && toolInvocation.result?.success !== false && !toolInvocation.result?.error;
  const hasOutput = isComplete && (toolInvocation.result?.data || toolInvocation.result?.error);
  const hasError = isComplete && toolInvocation.result?.error;

  const getCommandDetails = () => {
    if (!toolInvocation.args) return null;
    
    const { args, toolName } = toolInvocation;
    const detailsMap = {
      execute_command: () => args.command,
      read_file: () => args.filePath || args.path,
      write_file: () => args.filePath || args.path,
      list_files: () => args.path || args.directory || '/',
    };
    
    return detailsMap[toolName as keyof typeof detailsMap]?.() || null;
  };

  const getFormattedOutput = () => {
    const { result, toolName } = toolInvocation;
    if (!result) return null;
    
    if (result.error) return result.error;
    if (!result.data) return null;

    const formatters = {
      execute_command: () => {
        const { stdout, stderr } = result.data;
        const output = [stdout, stderr].filter(Boolean).join('\n');
        return output || 'Command completed with no output';
      },
      read_file: () => {
        const content = result.data.content || result.data;
        if (typeof content === 'string') {
          return content.length > LIMITS.contentTruncateLength 
            ? content.slice(0, LIMITS.contentTruncateLength) + '...' 
            : content;
        }
        return content;
      },
      list_files: () => {
        const files = result.data.files || result.data;
        return Array.isArray(files) ? `Found ${files.length} items` : files;
      },
    };

    const formatter = formatters[toolName as keyof typeof formatters];
    if (formatter) return formatter();
    
    return typeof result.data === 'string' 
      ? result.data 
      : JSON.stringify(result.data, null, 2);
  };

  const commandDetails = getCommandDetails();
  const output = getFormattedOutput();
  const toolConfig = getToolConfig(toolInvocation.toolName);

  const renderStatusIcon = () => {
    if (isComplete) {
      return isSuccess 
        ? <CheckCircle className="w-3 h-3" style={{ color: COLORS.muted }} />
        : <XCircle className="w-3 h-3 text-red-500" />;
    }
    // Show loading for both partial-call and call states
    return <Loader2 className="w-3 h-3 animate-spin" />;
  };

  const headerClassNames = `py-1 flex items-center gap-2 ${
    hasOutput ? 'cursor-pointer hover:text-muted-foreground transition-colors' : ''
  }`;

  return (
    <div className="text-xs" style={{ color: COLORS.muted }}>
      <div className={headerClassNames} onClick={() => hasOutput && setIsExpanded(!isExpanded)}>
        <div className="flex-shrink-0">{renderStatusIcon()}</div>
        
        <span className="font-medium">{toolConfig.name}</span>
        
        {/* Show "Executing tool" for partial-call state */}
        {toolInvocation.state === 'partial-call' && (
          <span className="text-xs font-medium" style={{ color: COLORS.mutedLight }}>
            Executing...
          </span>
        )}

        {commandDetails && !isComplete && toolInvocation.state !== 'partial-call' && (
          <span className="font-mono truncate flex-1" style={{ color: COLORS.mutedLight }}>
            {commandDetails}
          </span>
        )}

        {hasOutput && (
          <div className="flex-shrink-0 ml-auto">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
        )}
      </div>

      {commandDetails && isComplete && !isExpanded && (
        <div className="pl-5 text-xs font-mono truncate" style={{ color: COLORS.mutedLight }}>
          {commandDetails}
        </div>
      )}

      {isExpanded && output && (
        <div className="pl-5 pt-1">
          <div className="border-l-2 border-border pl-2">
            <div 
              className="text-xs font-mono bg-muted/30 rounded p-2 border border-border"
              style={{ 
                color: COLORS.mutedLighter,
                maxHeight: `${LIMITS.maxOutputHeight}px`,
                overflowY: output.length > LIMITS.contentTruncateLength ? 'auto' : 'visible',
                overflowX: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {output}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}