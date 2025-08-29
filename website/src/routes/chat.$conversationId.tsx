import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'
import { WaitingForCursor } from '../components/WaitingForCursor'
import { NotFoundPage } from './_404'
import { useEffect, useMemo } from 'react'
import { UserMessage } from '../components/messages/UserMessage'
import { AssistantMessage } from '../components/messages/AssistantMessage'
import { SystemMessage } from '../components/messages/SystemMessage'
import { ToolCallDisplay } from '../components/messages/ToolCallDisplay'
import type { Doc } from '../../convex/_generated/dataModel'
import type { ToolCallPart, ToolResultPart } from '../../convex/schema'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
const convexClient = new ConvexHttpClient(CONVEX_URL)

export const Route = createFileRoute('/chat/$conversationId')({
  loader: async ({ params }) => {
    const conversation = await convexClient.query(api.conversations.get, {
      conversationId: params.conversationId
    })
    
    const messages = await convexClient.query(api.messages.getMessagesByConversation, {
      conversationId: params.conversationId
    })
    
    return { messages, conversation }
  },
  component: ChatPage,
})

function ChatPage() {
  const { conversationId } = Route.useParams()
  const { messages, conversation } = Route.useLoaderData()
  const router = useRouter()
  
  // Auto-refresh if conversation is pending
  useEffect(() => {
    if (conversation?.status === 'pending') {
      const interval = setInterval(() => {
        router.invalidate()
      }, 2000) // Check every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [conversation?.status, router])

  // If no conversation found, show 404
  if (!conversation) {
    return <NotFoundPage />
  }

  // If conversation is pending, show waiting screen
  if (conversation.status === 'pending') {
    return <WaitingForCursor conversationId={conversationId} />
  }


  // Process messages to group tool calls with their results
  const processedMessages = useMemo(() => {
    const toolResultMap = new Map<string, ToolResultPart>()
    
    // First, collect all tool results by toolCallId
    messages.forEach((message: Doc<"messages">) => {
      if (message.role === 'tool' && Array.isArray(message.content)) {
        message.content.forEach((result: ToolResultPart) => {
          toolResultMap.set(result.toolCallId, result)
        })
      }
    })

    // Process messages and group tool calls with results
    const processed: Array<Doc<"messages"> & { toolCalls?: Array<{ call: ToolCallPart, result?: ToolResultPart }> }> = []
    
    for (const message of messages) {
      // Skip tool messages as they'll be shown with assistant messages
      if (message.role === 'tool') {
        continue
      }
      
      // For assistant messages, extract tool calls
      if (message.role === 'assistant' && Array.isArray(message.content)) {
        const textParts = message.content.filter((part) => part.type === 'text')
        const toolCalls = message.content.filter((part): part is ToolCallPart => part.type === 'tool-call')
        
        processed.push({
          ...message,
          content: textParts.length > 0 ? textParts : message.content,
          toolCalls: toolCalls.map((call) => ({
            call,
            result: toolResultMap.get(call.toolCallId)
          }))
        })
      } else {
        processed.push(message)
      }
    }
    
    return processed
  }, [messages])

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 border-b border-border pb-4">
          <h1 className="text-2xl font-mono font-semibold text-foreground">
            <span className="text-muted-foreground">$</span> {conversationId}
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {messages.length} messages
          </p>
        </div>
        
        <div className="relative">
          <div className="w-px bg-border absolute top-0 left-2" style={{height: '100%'}} />
          <div className="">
            {processedMessages.map((message, index) => (
              <div key={message._id}>
                {message.role === 'user' && (
                  <UserMessage 
                    content={message.content}
                    timestamp={message.timestamp}
                    messageOrder={message.messageOrder ?? index}
                  />
                )}
                
                {message.role === 'assistant' && (
                  <>
                    <AssistantMessage 
                      content={message.content}
                      timestamp={message.timestamp}
                      messageOrder={message.messageOrder ?? index}
                    />
                    {message.toolCalls?.map((toolCall) => (
                      <ToolCallDisplay
                        key={toolCall.call.toolCallId}
                        toolCall={toolCall.call}
                        toolResult={toolCall.result}
                      />
                    ))}
                  </>
                )}
                
                {message.role === 'system' && (
                  <SystemMessage 
                    content={message.content}
                    timestamp={message.timestamp}
                    messageOrder={message.messageOrder ?? index}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 pb-8 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            End of conversation
          </p>
        </div>
      </div>
    </div>
  )
}
