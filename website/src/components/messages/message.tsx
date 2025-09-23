import type { MyUIMessage } from '../../pages/build/components/chat/utils';
import { ChatStatus } from 'ai';
import { User, Bot } from 'lucide-react'

export default function Message({
  message,
  status,
}: {
  status: ChatStatus;
  message: MyUIMessage;
  regenerate: ({ messageId }: { messageId: string }) => void;
  sendMessage: ({
    text,
    messageId,
  }: {
    text: string;
    messageId?: string;
  }) => void;
}) {
  const date = message.metadata?.createdAt
    ? new Date(message.metadata.createdAt).toLocaleString()
    : '';
  const isUser = message.role === 'user';

  return (
    <div className="mb-6">
      <div className="flex gap-2 justify-start items-center mb-1">
        <div className="flex w-4 h-4 rounded-full bg-background border justify-center items-center">
          {isUser ? <User className="h-2.5 w-2.5 text-primary" /> : <Bot className="h-2.5 w-2.5 text-primary" />}
        </div>
        <div className="flex gap-1">
          <span className="text-xs font-medium text-muted-foreground font-mono">
            {isUser ? 'User' : 'Assistant'}
          </span>
          {date && (
            <span className="text-xs text-muted-foreground font-mono opacity-50">
              {date}
            </span>
          )}
        </div>
        
      </div>

      <div className="text-sm text-foreground leading-relaxed ml-6">
        {message.parts
          .map(part => (part.type === 'text' ? part.text : ''))
          .join('')}
      </div>
    </div>
  )
}