import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

// Helper functions for message serialization
function serializeMessage(message: unknown): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(JSON.stringify(message));
  return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
}

function deserializeMessage(bytes: ArrayBuffer): unknown {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(new Uint8Array(bytes)));
}

export function useFileMessages(fileId?: Id<"files">, organizationId?: Id<"organizations">) {
  const { data: session } = useSession();
  
  // Query to get the message for a file (single message per file)
  const message = useQuery(
    api.fileMessages.getMessage,
    fileId && organizationId
      ? { fileId, organizationId }
      : "skip"
  );
  
  // Mutations
  const createMessageMutation = useMutation(api.fileMessages.createMessage);
  const updateMessageMutation = useMutation(api.fileMessages.updateMessage);
  const deleteMessageMutation = useMutation(api.fileMessages.deleteMessage);
  const deleteMessageForFileMutation = useMutation(api.fileMessages.deleteMessageForFile);
  
  // Function to create a new message
  const createMessage = async (message: unknown) => {
    if (!fileId || !organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    const messageBytes = serializeMessage(message);
    
    return await createMessageMutation({
      fileId,
      organizationId,
      message: messageBytes,
    });
  };
  
  // Function to update an existing message
  const updateMessage = async (messageId: Id<"fileMessages">, message: unknown) => {
    if (!organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    const messageBytes = serializeMessage(message);
    
    return await updateMessageMutation({
      messageId,
      organizationId,
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
    });
  };
  
  // Function to delete the message for the file
  const deleteMessageForFile = async () => {
    if (!fileId || !organizationId || !session?.user?.id) {
      throw new Error('Missing required parameters');
    }
    
    return await deleteMessageForFileMutation({
      fileId,
      organizationId,
    });
  };
  
  // Convert message to usable format
  const deserializedMessage = message ? {
    ...message,
    data: deserializeMessage(message.message)
  } : null;
  
  return {
    // Raw message with bytes
    message,
    
    // Deserialized message with data
    deserializedMessage,
    
    // Message operations
    createMessage,
    updateMessage,
    deleteMessage,
    deleteMessageForFile,
    
    // Utility functions
    serializeMessage,
    deserializeMessage,
    
    // Loading states
    isLoading: message === undefined,
    hasMessage: message !== null && message !== undefined,
  };
}