import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface ToolCallMessageProps {
  part: {
    type: 'tool-invocation';
    toolInvocation: {
      toolCallId: string;
      toolName: string;
      args?: Record<string, unknown>;
      state: 'partial-call' | 'call' | 'result';
      result?: {
        data?: unknown;
        error?: string;
      };
    };
  };
}

export function ToolCallMessage({ part }: ToolCallMessageProps) {
  const { toolInvocation } = part;
  
  const getToolDisplayName = (toolName: string) => {
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderStatusIcon = () => {
    switch (toolInvocation.state) {
      case 'partial-call':
      case 'call':
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
      case 'result':
        const hasError = toolInvocation.result?.error;
        return hasError 
          ? <XCircle className="w-3 h-3 text-red-500" />
          : <CheckCircle className="w-3 h-3 text-muted-foreground" />;
      default:
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    }
  };

  const renderContent = () => {
    switch (toolInvocation.state) {
      case 'partial-call':
        return (
          <span className="text-xs text-muted-foreground">
            Executing tool: {toolInvocation.toolName}
          </span>
        );
      case 'call':
        return (
          <span className="text-xs text-muted-foreground">
            Running {getToolDisplayName(toolInvocation.toolName)}...
          </span>
        );
      case 'result':
        const hasError = toolInvocation.result?.error;
        const hasOutput = toolInvocation.result?.data || toolInvocation.result?.error;
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              {hasError ? 'Failed:' : 'Completed:'} {getToolDisplayName(toolInvocation.toolName)}
            </div>
            {hasOutput && (
              <div className="text-xs font-mono bg-muted/30 rounded p-2 border border-border max-h-32 overflow-y-auto">
                {hasError ? toolInvocation.result?.error : JSON.stringify(toolInvocation.result?.data, null, 2)}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-2 text-xs text-muted-foreground py-1">
      <div className="flex-shrink-0 mt-0.5">{renderStatusIcon()}</div>
      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}