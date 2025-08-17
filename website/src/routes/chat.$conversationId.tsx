import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../convex/_generated/api'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
const convexClient = new ConvexHttpClient(CONVEX_URL)

export const Route = createFileRoute('/chat/$conversationId')({
  loader: async ({ params }) => {
    const messages = await convexClient.query(api.messages.getMessagesByConversation, {
      conversationId: params.conversationId
    })
    return { messages }
  },
  component: ChatPage,
})

function ChatPage() {
  const { conversationId } = Route.useParams()
  const { messages } = Route.useLoaderData()

  if (messages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-2">
            💬 No messages found for conversation "{conversationId}"
          </p>
          <p className="text-sm text-gray-500">
            This conversation is empty or doesn't exist yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Conversation: {conversationId}
        </h1>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`p-4 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : message.role === 'assistant'
                  ? 'bg-green-50 border-l-4 border-green-500'
                  : 'bg-gray-50 border-l-4 border-gray-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm uppercase tracking-wide">
                  {message.role}
                </span>
                {message.timestamp && (
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="text-gray-800">
                {typeof message.content === 'string' 
                  ? message.content 
                  : JSON.stringify(message.content, null, 2)
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
