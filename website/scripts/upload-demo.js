#!/usr/bin/env node

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const CONVERSATION_ID = 'demo-chat';

// Determine the base URL for the final conversation link
const getBaseUrl = () => {
  if (process.env.API_URL) {
    return process.env.API_URL.replace('/api', '');
  }
  return 'http://localhost:3000';
};

// Generate a simple UUID-like ID
function generateId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

// Documentation conversation messages
const messages = [
  {
    messageId: generateId(),
    role: 'user',
    content: 'What is Oscar?',
    messageOrder: 0
  },
  {
    messageId: generateId(),
    role: 'assistant',
    content: 'Oscar is a tool that allows you to share your AI conversations from Cursor as public links. It\'s designed to make it easy to share debugging sessions, code reviews, and learning materials with your team or the broader community.\n\nWhen you use Oscar, your conversations are uploaded to a web interface where others can view them in a clean, readable format.',
    messageOrder: 1
  },
  {
    messageId: generateId(),
    role: 'user',
    content: 'How do I install Oscar in Cursor?',
    messageOrder: 2
  },
  {
    messageId: generateId(),
    role: 'assistant',
    content: 'Installing Oscar in Cursor is straightforward:\n\n1. Open Cursor\n2. Click on the installation link: [Install Oscar](cursor://anysphere.cursor-deeplink/mcp/install?name=oscar&config=eyJjb21tYW5kIjoibnB4IEBqdmVycmUvb3NjYXIifQ%3D%3D)\n3. Cursor will prompt you to confirm the installation\n4. Once installed, Oscar will be available as an MCP (Model Context Protocol) server\n\nAlternatively, you can install it manually through Cursor\'s settings by adding Oscar as an MCP server.',
    messageOrder: 3
  },
  {
    messageId: generateId(),
    role: 'user',
    content: 'How do I share a conversation using Oscar?',
    messageOrder: 4
  },
  {
    messageId: generateId(),
    role: 'assistant',
    content: 'To share a conversation using Oscar, simply use the `/share` command in your Cursor chat:\n\n1. Type `/share` in your conversation\n2. Oscar will automatically upload the current conversation\n3. You\'ll receive a shareable link like: `https://getoscar.ai/chat/your-conversation-id`\n4. Share this link with anyone who needs to see the conversation\n\nThe shared conversation will include all messages up to that point, preserving the context and flow of your discussion.',
    messageOrder: 5
  },
  {
    messageId: generateId(),
    role: 'user',
    content: 'What are some common use cases for Oscar?',
    messageOrder: 6
  },
  {
    messageId: generateId(),
    role: 'assistant',
    content: 'Oscar is particularly useful for several scenarios:\n\n**1. Debugging Sessions**\nShare complex debugging conversations with team members who can review the problem-solving process and provide additional insights.\n\n**2. Code Reviews**\nWhen discussing code improvements with AI, share the conversation to document the reasoning behind changes.\n\n**3. Learning Materials**\nCreate educational content by sharing conversations that explain programming concepts, patterns, or solutions.\n\n**4. Team Collaboration**\nShare AI-assisted brainstorming sessions or architectural discussions with your team.\n\n**5. Documentation**\nUse shared conversations as supplementary documentation for your projects, showing how certain features were implemented or problems were solved.\n\nEach shared conversation becomes a permanent resource that can be referenced later, making knowledge sharing more efficient.',
    messageOrder: 7
  }
];

async function uploadConversation() {
  try {
    console.log('Clearing existing messages...');
    
    // First, clear any existing messages for this conversation
    const clearResponse = await fetch(`${API_URL}/clear_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: CONVERSATION_ID
      })
    });

    if (clearResponse.ok) {
      const clearResult = await clearResponse.json();
      console.log('Cleared messages:', clearResult);
    } else {
      console.log('No existing messages to clear or conversation doesn\'t exist yet');
    }

    console.log('Creating conversation...');
    
    // Then, create the conversation
    const createResponse = await fetch(`${API_URL}/create_conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: CONVERSATION_ID
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create conversation: ${error}`);
    }

    const createResult = await createResponse.json();
    console.log('Conversation created:', createResult);

    // Then upload the messages
    console.log('Uploading messages...');
    
    const uploadResponse = await fetch(`${API_URL}/upload_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: CONVERSATION_ID,
        messages: messages.map((msg, index) => ({
          ...msg,
          timestamp: Date.now() - (messages.length - index) * 1000, // Stagger timestamps
        }))
      })
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload messages: ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Messages uploaded:', uploadResult);
    console.log('\n✅ Success! View the conversation at:');
    console.log(`   ${getBaseUrl()}/chat/${CONVERSATION_ID}\n`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the upload
uploadConversation();