// ChatGPT Chat Capture Extension - Popup Script

let capturedChats = [];
let currentChatId = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadCapturedChats();
  renderChatList();
  setupEventListeners();
});

// Load captured chats from storage
async function loadCapturedChats() {
  return new Promise((resolve) => {
    chrome.storage.local.get('capturedChats', (result) => {
      capturedChats = result.capturedChats || [];
      updateChatCount();
      resolve();
    });
  });
}

// Update chat count in header
function updateChatCount() {
  const countElement = document.getElementById('chatCount');
  const count = capturedChats.length;
  countElement.textContent = `${count} chat${count !== 1 ? 's' : ''}`;
}

// Render the chat list
function renderChatList() {
  const chatList = document.getElementById('chatList');
  const emptyState = document.getElementById('emptyState');
  
  if (capturedChats.length === 0) {
    emptyState.style.display = 'block';
    chatList.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  chatList.style.display = 'block';
  
  chatList.innerHTML = capturedChats.map(chat => `
    <div class="chat-item" data-chat-id="${chat.id}">
      <div class="chat-title">${escapeHtml(chat.title)}</div>
      <div class="chat-meta">
        <span class="chat-date">${formatDate(chat.timestamp)}</span>
        <span class="chat-count">${chat.messages.length} messages</span>
      </div>
    </div>
  `).join('');
  
  // Add click listeners
  chatList.querySelectorAll('.chat-item').forEach(item => {
    item.addEventListener('click', () => {
      const chatId = item.dataset.chatId;
      // Open in new tab at getoscar.ai
      window.open(`https://getoscar.ai/chat/${chatId}`, '_blank');
    });
  });
}

// Format date for display
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // Format as date
  return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open chat modal
function openChatModal(chatId) {
  const chat = capturedChats.find(c => c.id === chatId);
  if (!chat) return;
  
  currentChatId = chatId;
  
  const modal = document.getElementById('chatModal');
  const title = document.getElementById('modalTitle');
  const messages = document.getElementById('chatMessages');
  
  title.textContent = chat.title;
  
  messages.innerHTML = chat.messages.map(message => `
    <div class="message ${message.role}">
      <div class="message-role">${message.role}</div>
      <div class="message-content">${escapeHtml(message.content)}</div>
    </div>
  `).join('');
  
  modal.style.display = 'block';
}

// Close chat modal
function closeChatModal() {
  const modal = document.getElementById('chatModal');
  modal.style.display = 'none';
  currentChatId = null;
}

// Copy chat content to clipboard
async function copyCurrentChat() {
  if (!currentChatId) return;
  
  const chat = capturedChats.find(c => c.id === currentChatId);
  if (!chat) return;
  
  const content = formatChatForCopy(chat);
  
  try {
    await navigator.clipboard.writeText(content);
    showToast('Chat copied to clipboard!');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy chat', 'error');
  }
}

// Format chat for copying
function formatChatForCopy(chat) {
  let content = `# ${chat.title}\n`;
  content += `*Captured: ${new Date(chat.timestamp).toLocaleString()}*\n`;
  content += `*URL: ${chat.url}*\n\n`;
  
  chat.messages.forEach(message => {
    const role = message.role === 'user' ? 'You' : 'ChatGPT';
    content += `**${role}:**\n${message.content}\n\n`;
  });
  
  return content;
}

// Export current chat as JSON
function exportCurrentChat() {
  if (!currentChatId) return;
  
  const chat = capturedChats.find(c => c.id === currentChatId);
  if (!chat) return;
  
  downloadJSON(chat, `chatgpt-chat-${chat.id}.json`);
  showToast('Chat exported!');
}

// Delete current chat
async function deleteCurrentChat() {
  if (!currentChatId) return;
  if (!confirm('Are you sure you want to delete this chat?')) return;
  
  capturedChats = capturedChats.filter(chat => chat.id !== currentChatId);
  await saveCapturedChats();
  
  closeChatModal();
  renderChatList();
  showToast('Chat deleted');
}

// Export all chats
function exportAllChats() {
  if (capturedChats.length === 0) {
    showToast('No chats to export', 'error');
    return;
  }
  
  const exportData = {
    exported: new Date().toISOString(),
    chats: capturedChats
  };
  
  downloadJSON(exportData, `chatgpt-chats-${Date.now()}.json`);
  showToast(`Exported ${capturedChats.length} chats!`);
}

// Clear all chats
async function clearAllChats() {
  if (capturedChats.length === 0) return;
  if (!confirm(`Are you sure you want to delete all ${capturedChats.length} captured chats?`)) return;
  
  capturedChats = [];
  await saveCapturedChats();
  
  renderChatList();
  showToast('All chats cleared');
}

// Save chats to storage
async function saveCapturedChats() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ capturedChats }, resolve);
  });
}

// Download JSON file
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#e57878' : '#628066'};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Martian Mono', monospace;
    letter-spacing: -0.02em;
    z-index: 10000;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(98, 128, 102, 0.3);
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 100);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
}

// Setup event listeners
function setupEventListeners() {
  // Modal close
  document.querySelector('.close').addEventListener('click', closeChatModal);
  
  // Click outside modal to close
  document.getElementById('chatModal').addEventListener('click', (e) => {
    if (e.target.id === 'chatModal') {
      closeChatModal();
    }
  });
  
  // Modal action buttons
  document.getElementById('copyChat').addEventListener('click', copyCurrentChat);
  document.getElementById('exportChat').addEventListener('click', exportCurrentChat);
  document.getElementById('deleteChat').addEventListener('click', deleteCurrentChat);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentChatId) {
      closeChatModal();
    }
  });
}

// Listen for storage changes (when new chats are captured)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.capturedChats) {
    capturedChats = changes.capturedChats.newValue || [];
    updateChatCount();
    renderChatList();
  }
});