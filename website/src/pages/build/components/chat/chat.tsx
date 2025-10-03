import type { MyUIMessage } from './utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ChatInput from './chat-input';
import Message from '@/components/messages/message';

export default function ChatComponent({
  chatData,
  chatUrl,
  previewToken,
  isNewChat = false,
  resume = false,
}: {
  chatData: { id: string; messages: MyUIMessage[] };
  chatUrl: string;
  previewToken: string;
  isNewChat?: boolean;
  resume?: boolean;
}) {

  const { status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatData.id,
    messages: chatData.messages,
    resume,
    transport: new DefaultChatTransport({
      api: chatUrl,
      headers: {
        'x-daytona-preview-token': previewToken,
        'x-daytona-skip-preview-warning': 'true',
        'X-Daytona-Disable-CORS': 'true'
      },
      prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => {
        switch (trigger) {
          case 'regenerate-message':
            // omit messages data transfer, only send the messageId:
            return {
              body: {
                trigger: 'regenerate-message',
                id,
                messageId,
              },
            };

          case 'submit-message':
            // only send the last message to the server to limit the request size:
            return {
              body: {
                trigger: 'submit-message',
                id,
                message: messages[messages.length - 1],
                messageId,
              },
            };
        }
      },
    }),
    onFinish(options) {
      console.log('onFinish', options);
    },
  });

  return (
    <div className="flex flex-col w-full h-full p-4">
      <div className="w-full flex-1 overflow-y-auto">
        {messages.map(message => (
          <Message
            key={message.id}
            message={message}
            regenerate={regenerate}
            sendMessage={sendMessage}
            status={status}
          />
        ))}
      </div>
      <div className="w-full">
        <ChatInput
          status={status}
          stop={stop}
          onSubmit={(text: string) => {
            sendMessage({ text, metadata: { createdAt: Date.now() } });

            if (isNewChat) {
              window.history.pushState(null, '', `/chat/${chatData.id}`);
            }
          }}
        />
      </div>
    </div>
  );
}