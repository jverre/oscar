// ChatGPT Chat Capture Extension - Content Script

let isCapturing = false;

// Monitor input field for "share" keyword
function monitorInput() {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) {
    setTimeout(monitorInput, 1000);
    return;
  }

  inputField.addEventListener('input', handleInputChange);
  inputField.addEventListener('keyup', handleInputChange);
}

function handleInputChange(event) {
  const text = event.target.textContent || event.target.value || '';
  
  if (text.toLowerCase().includes('share') && !isCapturing) {
    isCapturing = true;
    
    // Clear the "share" text
    event.target.textContent = text.replace(/share/gi, '').trim();
    
    // Trigger chat capture
    captureChat();
  }
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
      isCapturing = false;
      return;
    }
    
    // Create chat object
    const chat = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      title: generateChatTitle(messages),
      messages: messages,
      url: window.location.href
    };
    
    // Store the chat
    await storeCapturedChat(chat);
    
    console.log(`Captured chat with ${messages.length} messages`);
    showCaptureNotification(messages.length);
    
  } catch (error) {
    console.error('Error capturing chat:', error);
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorInput);
} else {
  monitorInput();
}

console.log('ChatGPT Chat Capture extension loaded');