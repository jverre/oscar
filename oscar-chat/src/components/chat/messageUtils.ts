interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: MessageContent | string;
}

type MessageContent = MessagePart[];

interface MessagePart {
  type: 'tool-call' | 'tool-result' | 'text';
  toolCallId?: string;
  text?: string;
  [key: string]: unknown;
}

export interface MessageGroup {
  userMessage?: Message;
  toolCalls: Map<string, { call?: MessagePart; result?: MessagePart }>;
  assistantText?: string;
}

export const createMessageGroup = (): MessageGroup => ({
  toolCalls: new Map(),
  assistantText: undefined,
});

export const processMessage = (message: Message, currentGroup: MessageGroup | null): MessageGroup => {
  if (message.role === 'user') {
    return {
      userMessage: message,
      toolCalls: new Map(),
      assistantText: undefined,
    };
  }

  const group = currentGroup || createMessageGroup();

  if (message.role === 'assistant') {
    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'tool-call') {
          const existing = group.toolCalls.get(part.toolCallId || '') || {};
          group.toolCalls.set(part.toolCallId || '', { ...existing, call: part });
        } else if (part.type === 'text') {
          group.assistantText = (group.assistantText || '') + (part.text || '');
        }
      }
    } else if (typeof message.content === 'string') {
      group.assistantText = message.content;
    }
  } else if (message.role === 'tool' && Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'tool-result') {
        const existing = group.toolCalls.get(part.toolCallId || '') || {};
        group.toolCalls.set(part.toolCallId || '', { ...existing, result: part });
      }
    }
  }

  return group;
};

export const groupMessages = (messages: Message[]): MessageGroup[] => {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const message of messages) {
    if (message.role === 'user') {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = processMessage(message, null);
    } else {
      currentGroup = processMessage(message, currentGroup);
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
};