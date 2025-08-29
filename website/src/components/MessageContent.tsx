import { useState } from 'react'
import { Copy, Check, FileText, Image } from 'lucide-react'
import type { TextPart, ImagePart, FilePart } from '../../convex/schema'

type MessagePart = TextPart | ImagePart | FilePart

interface MessageContentProps {
  content: string | MessagePart[] | any
  role: 'system' | 'user' | 'assistant' | 'tool'
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
      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
        <code className="text-muted-foreground font-mono">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  )
}

function renderPart(part: MessagePart, index: number) {
  switch (part.type) {
    case 'text':
      return (
        <p key={index} className="whitespace-pre-wrap text-foreground">
          {part.text}
        </p>
      )

    case 'image': {
      const imageUrl = typeof part.image === 'string' ? part.image : part.image.url
      return (
        <div key={index} className="my-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Image className="h-4 w-4" />
            <span>Image</span>
          </div>
          <img
            src={imageUrl}
            alt="Message attachment"
            className="max-w-full h-auto rounded-md border border-border"
          />
        </div>
      )
    }

    case 'file': {
      const fileUrl = typeof part.data === 'string' 
        ? `data:${part.mediaType};base64,${part.data}`
        : part.data.url
      return (
        <div key={index} className="my-4 p-4 bg-muted rounded-md">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">
              {part.filename || 'Untitled'}
            </span>
            <span className="text-xs text-muted-foreground">
              ({part.mediaType})
            </span>
          </div>
          <a
            href={fileUrl}
            download={part.filename}
            className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80"
          >
            Download
          </a>
        </div>
      )
    }


    default:
      return null
  }
}

export function MessageContent({ content, role }: MessageContentProps) {
  if (typeof content === 'string') {
    return <p className="whitespace-pre-wrap text-foreground">{content}</p>
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-3">
        {content.map((part, index) => renderPart(part, index))}
      </div>
    )
  }


  // Fallback for unexpected content types
  return <CodeBlock code={JSON.stringify(content, null, 2)} />
}