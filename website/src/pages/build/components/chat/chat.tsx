import type { MyUIMessage } from './utils';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef } from 'react';
import ChatInput from './chat-input';
import Message from './message';

export default function ChatComponent({
  chatData,
  isNewChat = false,
  resume = false,
}: {
  chatData: { id: string; messages: MyUIMessage[] };
  isNewChat?: boolean;
  resume?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatData.id,
    messages: chatData.messages,
    resume,
    transport: new DefaultChatTransport({
      api: 'http://localhost:3001/chat',
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

      // focus the input field again after the response is finished
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
  });

  // activate the input field
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col justify-between w-full stretch h-full p-4">
      <div className="w-full">
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
      <div >
        <ChatInput
          status={status}
          stop={stop}
          onSubmit={(text: string) => {
            sendMessage({ text, metadata: { createdAt: Date.now() } });

            if (isNewChat) {
              window.history.pushState(null, '', `/chat/${chatData.id}`);
            }
          }}
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}