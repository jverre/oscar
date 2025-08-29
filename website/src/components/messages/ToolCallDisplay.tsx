import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Wrench, Copy, Check } from 'lucide-react'
import type { ToolCallPart, ToolResultPart } from '../../../convex/schema'

interface ToolCallDisplayProps {
  toolCall: ToolCallPart
  toolResult?: ToolResultPart
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="bg-muted/30 p-2 rounded text-xs overflow-x-auto">
        <code className="text-muted-foreground font-mono">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

export function ToolCallDisplay({ toolCall, toolResult }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const isError = toolResult?.output.type.startsWith('error-')
  const isSuccess = toolResult && !isError

  const renderToolResult = () => {
    if (!toolResult) {
      return <p className="text-xs text-muted-foreground">Waiting for result...</p>
    }

    const { output } = toolResult

    if (output.type === 'content' && Array.isArray(output.value)) {
      return (
        <div className="space-y-2">
          {output.value.map((item: any, i: number) => (
            <div key={i}>
              {item.type === 'text' ? (
                <p className="text-xs whitespace-pre-wrap">{item.text}</p>
              ) : item.type === 'media' ? (
                <img
                  src={`data:${item.mediaType};base64,${item.data}`}
                  alt="Tool output"
                  className="max-w-full h-auto rounded border border-border"
                />
              ) : null}
            </div>
          ))}
        </div>
      )
    }

    const value = typeof output.value === 'string' 
      ? output.value 
      : JSON.stringify(output.value, null, 2)

    return <CodeBlock code={value} />
  }

  return (
    <div className="flex">
      <div className="w-4 flex justify-center pt-1">
        <div className="w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center relative z-10">
          <Wrench className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 pl-3 pb-6">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-muted/30 rounded px-1 py-0.5 transition-colors group pt-1"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-mono text-muted-foreground">
            {toolCall.toolName}
          </span>
          <div className="flex items-center ml-1">
            {isSuccess && <CheckCircle className="h-3 w-3 text-green-500" />}
            {isError && <XCircle className="h-3 w-3 text-destructive" />}
            {!toolResult && (
              <div className="h-3 w-3 rounded-full border border-muted-foreground border-t-transparent animate-spin" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1 pl-2">
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1 font-mono">
                Parameters
              </h5>
              <CodeBlock code={JSON.stringify(toolCall.args, null, 2)} />
            </div>

            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1 font-mono">
                Result
              </h5>
              {renderToolResult()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}