import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// Helper functions for message serialization
function serializeMessage(message: any): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(JSON.stringify(message));
  return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
}

function deserializeMessage(bytes: ArrayBuffer): any {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(new Uint8Array(bytes)));
}

export function useFileMessages(fileId?: Id<"files">, organizationId?: Id<"organizations">) {
  const { data: session } = useSession();
  
  // Query to get all messages for a file
  const messages = useQuery(
    api.fileMessages.getMessages,
    fileId && organizationId
      ? { fileId, organizationId }
      : "skip"
  );
  
  // Query to get the latest message for a file
  const latestMessage = useQuery(
    api.fileMessages.getLatestMessage,
    fileId && organizationId
      ? { fileId, organizationId }
      : "skip"
  );
  
  // Mutations
  const createMessageMutation = useMutation(api.fileMessages.createMessage);
  const updateMessageMutation = useMutation(api.fileMessages.updateMessage);
  const deleteMessageMutation = useMutation(api.fileMessages.deleteMessage);
  const deleteAllMessagesMutation = useMutation(api.fileMessages.deleteAllMessagesForFile);
  
  // Function to create a new message
  const createMessage = async (message: any) => {
    if (!fileId || !organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    const messageBytes = serializeMessage(message);
    
    return await createMessageMutation({
      fileId,
      organizationId,
      userId: session.user.id as Id<"users">,
      message: messageBytes,
    });
  };
  
  // Function to update an existing message
  const updateMessage = async (messageId: Id<"fileMessages">, message: any) => {
    if (!organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    const messageBytes = serializeMessage(message);
    
    return await updateMessageMutation({
      messageId,
      organizationId,
      userId: session.user.id as Id<"users">,
      message: messageBytes,
    });
  };
  
  // Function to delete a message
  const deleteMessage = async (messageId: Id<"fileMessages">) => {
    if (!organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    return await deleteMessageMutation({
      messageId,
      organizationId,
      userId: session.user.id as Id<"users">,
    });
  };
  
  // Function to delete all messages for the file
  const deleteAllMessages = async () => {
    if (!fileId || !organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    return await deleteAllMessagesMutation({
      fileId,
      organizationId,
      userId: session.user.id as Id<"users">,
    });
  };
  
  // Convert messages to usable format
  const deserializedMessages = messages?.map(msg => ({
    ...msg,
    data: deserializeMessage(msg.message)
  }));
  
  const deserializedLatestMessage = latestMessage ? {
    ...latestMessage,
    data: deserializeMessage(latestMessage.message)
  } : null;
  
  return {
    // Raw messages with bytes
    messages,
    latestMessage,
    
    // Deserialized messages with data
    deserializedMessages,
    deserializedLatestMessage,
    
    // Message operations
    createMessage,
    updateMessage,
    deleteMessage,
    deleteAllMessages,
    
    // Utility functions
    serializeMessage,
    deserializeMessage,
    
    // Loading states
    isLoading: messages === undefined,
    hasMessages: (messages?.length ?? 0) > 0,
  };
}