// ChatGPT Chat Capture Extension - Content Script

let isCapturing = false;

// Monitor input field for "share" keyword
function monitorInput() {
  console.log('[ChatGPT Capture] Attempting to find input field...');
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) {
    console.log('[ChatGPT Capture] Input field not found, retrying in 1s...');
    setTimeout(monitorInput, 1000);
    return;
  }

  console.log('[ChatGPT Capture] Input field found!', inputField);

  // Listen for Enter key press to detect submission
  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      const text = inputField.textContent || '';
      console.log('[ChatGPT Capture] Enter pressed with text:', JSON.stringify(text));

      if (text.toLowerCase().trim() === '/share' && !isCapturing) {
        console.log('[ChatGPT Capture] /share detected on submit! Preventing default and starting capture...');

        // Prevent the message from being sent to ChatGPT
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        isCapturing = true;

        // Clear the input
        inputField.textContent = '';

        // Insert user message showing /share
        insertUserMessage('/share');

        // Scroll to show the user message
        scrollToBottom();

        // Trigger chat capture and show response
        captureChat();
      }
    }
  }, true); // Use capture phase to intercept early

  // Also watch for form submission
  const form = inputField.closest('form');
  if (form) {
    console.log('[ChatGPT Capture] Form found, attaching submit listener');
    form.addEventListener('submit', (event) => {
      const text = inputField.textContent || '';
      console.log('[ChatGPT Capture] Form submit event with text:', JSON.stringify(text));

      if (text.toLowerCase().trim() === '/share' && !isCapturing) {
        console.log('[ChatGPT Capture] /share detected on form submit! Preventing default...');

        // Prevent the form from submitting
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        isCapturing = true;

        // Clear the input
        inputField.textContent = '';

        // Insert user message showing /share
        insertUserMessage('/share');

        // Trigger chat capture and show response
        captureChat();
      }
    }, true); // Use capture phase
  }

  // Also watch for the send button click
  const observeSendButton = () => {
    const sendButton = document.querySelector('[data-testid="send-button"]') ||
                       document.querySelector('button[data-testid*="send"]') ||
                       inputField.closest('form')?.querySelector('button[type="submit"]');
    if (sendButton) {
      console.log('[ChatGPT Capture] Send button found');
      sendButton.addEventListener('click', (event) => {
        const text = inputField.textContent || '';
        console.log('[ChatGPT Capture] Send button clicked with text:', JSON.stringify(text));

        if (text.toLowerCase().trim() === '/share' && !isCapturing) {
          console.log('[ChatGPT Capture] /share detected on send button! Preventing default...');

          // Prevent the button click from submitting
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          isCapturing = true;

          // Clear the input
          inputField.textContent = '';

          // Insert user message showing /share
          insertUserMessage('/share');

          // Scroll to show the user message
          scrollToBottom();

          // Trigger chat capture and show response
          captureChat();

          return false;
        }
      }, true); // Use capture phase
    } else {
      setTimeout(observeSendButton, 1000);
    }
  };

  observeSendButton();

  console.log('[ChatGPT Capture] Event listeners attached');
}

// Scroll to bottom of chat
function scrollToBottom(smooth = true) {
  // Try to find the actual scroll container - it's the parent of the thread container
  const threadContainer = document.querySelector('.flex.flex-col.text-sm');
  const scrollContainer = threadContainer?.parentElement ||
                          document.querySelector('[class*="overflow-y-auto"]') ||
                          document.querySelector('main [class*="react-scroll"]') ||
                          document.querySelector('main');

  console.log('[ChatGPT Capture] Scrolling with container:', scrollContainer);
  console.log('[ChatGPT Capture] scrollHeight:', scrollContainer?.scrollHeight);

  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight + 1000,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }
}

// Insert a user message into the chat
function insertUserMessage(text) {
  const threadContainer = document.querySelector('.flex.flex-col.text-sm');
  if (!threadContainer) {
    console.log('[ChatGPT Capture] Thread container not found');
    return;
  }

  const userMessageHTML = `
    <article class="text-token-text-primary w-full focus:outline-none" tabindex="-1" dir="auto" data-testid="conversation-turn-share" data-scroll-anchor="false" data-turn="user">
      <h5 class="sr-only">You said:</h5>
      <div class="text-base my-auto mx-auto pt-3 [--thread-content-margin:--spacing(4)] thread-sm:[--thread-content-margin:--spacing(6)] thread-lg:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)">
        <div class="[--thread-content-max-width:40rem] thread-lg:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 group/turn-messages focus-visible:outline-hidden relative flex w-full min-w-0 flex-col" tabindex="-1">
          <div class="flex max-w-full flex-col grow">
            <div data-message-author-role="user" dir="auto" class="min-h-8 text-message relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal [.text-message+&]:mt-1">
              <div class="flex w-full flex-col gap-1 empty:hidden items-end rtl:items-start">
                <div class="user-message-bubble-color relative rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 max-w-[var(--user-chat-width,70%)]">
                  <div class="whitespace-pre-wrap">${text}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;

  threadContainer.insertAdjacentHTML('beforeend', userMessageHTML);

  // Scroll to show the user message
  setTimeout(() => {
    scrollToBottom(false);
  }, 50);
}

// Insert an assistant message into the chat
function insertAssistantMessage(text) {
  const threadContainer = document.querySelector('.flex.flex-col.text-sm');
  if (!threadContainer) {
    console.log('[ChatGPT Capture] Thread container not found');
    return;
  }

  // Convert markdown links to HTML
  const htmlText = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline hover:no-underline">$1</a>');

  const assistantMessageHTML = `
    <article id="oscar-share-message" class="text-token-text-primary w-full focus:outline-none" tabindex="-1" dir="auto" data-testid="conversation-turn-share-response" data-scroll-anchor="false" data-turn="assistant">
      <h6 class="sr-only">ChatGPT said:</h6>
      <div class="text-base my-auto mx-auto [--thread-content-margin:--spacing(4)] thread-sm:[--thread-content-margin:--spacing(6)] thread-lg:[--thread-content-margin:--spacing(16)] px-(--thread-content-margin)">
        <div class="[--thread-content-max-width:40rem] thread-lg:[--thread-content-max-width:48rem] mx-auto max-w-(--thread-content-max-width) flex-1 group/turn-messages focus-visible:outline-hidden relative flex w-full min-w-0 flex-col agent-turn" tabindex="-1">
          <div class="flex max-w-full flex-col grow">
            <div data-message-author-role="assistant" dir="auto" class="min-h-8 text-message relative flex w-full flex-col items-end gap-2 text-start break-words whitespace-normal [.text-message+&]:mt-1">
              <div class="flex w-full flex-col gap-1 empty:hidden first:pt-[1px]">
                <div class="markdown prose dark:prose-invert w-full break-words light markdown-new-styling">
                  <p>${htmlText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;

  threadContainer.insertAdjacentHTML('beforeend', assistantMessageHTML);

  // Scroll to bottom with extra padding
  setTimeout(() => {
    scrollToBottom();
  }, 100);
}

// Upload chat to Oscar backend
async function uploadChatToOscar(conversationId, messages) {
  try {
    // Step 1: Create conversation
    console.log('[ChatGPT Capture] Creating conversation:', conversationId);
    const createResponse = await fetch('https://www.getoscar.ai/api/create_conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create conversation: ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json();
    console.log('[ChatGPT Capture] Conversation created:', createResult);

    // Step 2: Format messages for upload
    const formattedMessages = messages.map((msg, index) => ({
      messageId: `${conversationId}-${index}`,
      role: msg.role,
      content: msg.content,
      messageOrder: index
    }));

    // Step 3: Upload messages
    console.log('[ChatGPT Capture] Uploading messages:', formattedMessages.length);
    const uploadResponse = await fetch('https://www.getoscar.ai/api/upload_messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId,
        messages: formattedMessages
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload messages: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('[ChatGPT Capture] Messages uploaded:', uploadResult);

    return { success: true, conversationId };
  } catch (error) {
    console.error('[ChatGPT Capture] Upload error:', error);
    throw error;
  }
}

// Generate a UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main chat capture function
async function captureChat() {
  try {
    console.log('Starting chat capture...');

    // Scroll to load all messages
    await loadAllMessages();

    // Extract chat messages
    const messages = extractChatMessages();

    if (messages.length === 0) {
      console.warn('No messages found to capture');
      insertAssistantMessage('No messages found to share.');
      isCapturing = false;
      return;
    }

    // Create chat object with UUID
    const chat = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      title: generateChatTitle(messages),
      messages: messages,
      url: window.location.href
    };

    // Store the chat locally
    await storeCapturedChat(chat);

    console.log(`Captured chat with ${messages.length} messages`);

    // Upload to Oscar backend
    await uploadChatToOscar(chat.id, messages);

    // Insert assistant response with share link
    insertAssistantMessage(`Your conversation has been shared! You can access it at: [https://www.getoscar.ai/chat/${chat.id}](https://www.getoscar.ai/chat/${chat.id})`);

  } catch (error) {
    console.error('Error capturing chat:', error);
    insertAssistantMessage('Sorry, there was an error sharing your conversation.');
  } finally {
    isCapturing = false;
  }
}

// Load all messages by scrolling
async function loadAllMessages() {
  const scrollContainer = document.querySelector('[data-testid="conversation-turn-0"]')?.closest('div[class*="react-scroll"]') || 
                         document.querySelector('main') || 
                         document.body;
  
  // Scroll to top first
  scrollContainer.scrollTop = 0;
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Scroll to bottom to load all messages
  let lastHeight = scrollContainer.scrollHeight;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newHeight = scrollContainer.scrollHeight;
    if (newHeight === lastHeight) break;
    
    lastHeight = newHeight;
    attempts++;
  }
  
  console.log(`Loaded messages after ${attempts} scroll attempts`);
}

// Extract chat messages from DOM
function extractChatMessages() {
  const messages = [];
  const articles = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
  
  articles.forEach((article, index) => {
    try {
      const authorElement = article.querySelector('[data-message-author-role]');
      if (!authorElement) return;
      
      const role = authorElement.getAttribute('data-message-author-role');
      
      if (role === 'user') {
        const content = extractUserMessage(article);
        if (content) {
          messages.push({ role: 'user', content: content.trim() });
        }
      } else if (role === 'assistant') {
        const content = extractAssistantMessage(article);
        if (content) {
          messages.push({ role: 'assistant', content: content.trim() });
        }
      }
    } catch (error) {
      console.warn(`Error extracting message from article ${index}:`, error);
    }
  });
  
  return messages;
}

// Extract user message content
function extractUserMessage(article) {
  const userDiv = article.querySelector('[data-message-author-role="user"]');
  if (!userDiv) return '';
  
  // Get the text content, preserving line breaks
  return userDiv.textContent || '';
}

// Extract assistant message content
function extractAssistantMessage(article) {
  const assistantDiv = article.querySelector('[data-message-author-role="assistant"]');
  if (!assistantDiv) return '';
  
  // Find the actual content div (usually has markdown content)
  const contentDiv = assistantDiv.querySelector('[class*="markdown"]') || 
                     assistantDiv.querySelector('div:not([class*="flex"]):not([class*="button"])') ||
                     assistantDiv;
  
  if (!contentDiv) return assistantDiv.textContent || '';
  
  // Extract formatted content preserving structure
  return extractFormattedContent(contentDiv);
}

// Extract formatted content (code blocks, lists, etc.)
function extractFormattedContent(element) {
  let content = '';
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      content += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Add line breaks for block elements
      if (['div', 'p', 'br', 'pre', 'code', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        if (tagName === 'br') {
          content += '\n';
        } else if (tagName === 'pre' || tagName === 'code') {
          // Handle code blocks
          if (node.textContent && !content.endsWith('\n')) {
            content += '\n';
          }
        }
      }
    }
  }
  
  return content.replace(/\n{3,}/g, '\n\n').trim();
}

// Generate a title for the chat
function generateChatTitle(messages) {
  if (messages.length === 0) return 'Empty Chat';
  
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'Chat Capture';
  
  const title = firstUserMessage.content.substring(0, 50).trim();
  return title + (firstUserMessage.content.length > 50 ? '...' : '');
}

// Store captured chat
async function storeCapturedChat(chat) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('capturedChats', (result) => {
      const chats = result.capturedChats || [];
      chats.unshift(chat); // Add to beginning
      
      // Keep only last 50 chats
      if (chats.length > 50) {
        chats.splice(50);
      }
      
      chrome.storage.local.set({ capturedChats: chats }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

// Show capture notification
function showCaptureNotification(messageCount) {
  const notification = document.createElement('div');
  notification.textContent = `✅ Captured ${messageCount} messages`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10a37f;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Initialize when DOM is ready
console.log('[ChatGPT Capture] Extension script starting... readyState:', document.readyState);
console.log('[ChatGPT Capture] URL:', window.location.href);

if (document.readyState === 'loading') {
  console.log('[ChatGPT Capture] Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', monitorInput);
} else {
  console.log('[ChatGPT Capture] DOM already ready, starting monitor...');
  monitorInput();
}

console.log('[ChatGPT Capture] Extension loaded successfully!');