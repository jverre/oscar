# ChatGPT Chat Capture Extension

A Chrome extension that captures ChatGPT conversations when you type "share" in the input field.

## Features

- 🔍 **Automatic Detection**: Monitors ChatGPT input field for "share" keyword
- 📱 **Smart Scrolling**: Automatically scrolls to load all messages (handles lazy loading)
- 💾 **Local Storage**: Stores captured chats locally in your browser
- 🖼️ **Clean UI**: Modern popup interface to view and manage captured chats
- 📋 **Export Options**: Copy to clipboard or export as JSON
- 🗑️ **Chat Management**: Delete individual chats or clear all

## Installation

1. **Download the extension files** to a folder (e.g., `chatgpt-capture-extension/`)

2. **Open Chrome** and go to `chrome://extensions/`

3. **Enable Developer mode** (toggle in the top right)

4. **Click "Load unpacked"** and select the extension folder

5. **The extension is now installed!** You'll see the ChatGPT Chat Capture icon in your toolbar.

## Usage

1. **Go to ChatGPT** (chatgpt.com or chat.openai.com)

2. **Have a conversation** with ChatGPT

3. **Type "share"** in the input field when you want to capture the chat

4. **The extension will:**
   - Automatically scroll to load all messages
   - Extract and save the entire conversation
   - Show a success notification
   - Clear "share" from the input field

5. **View captured chats** by clicking the extension icon in your toolbar

## File Structure

```
extensions/chrome/
├── manifest.json     # Extension configuration
├── content.js        # Main logic for monitoring and capturing
├── popup.html        # Popup interface HTML
├── popup.css         # Popup styling
├── popup.js          # Popup functionality
└── README.md         # This file
```

## How It Works

1. **Content Script** (`content.js`) runs on ChatGPT pages and:
   - Monitors the input field for "share" keyword
   - Scrolls to load all messages when triggered
   - Extracts conversation data from the DOM
   - Stores chats in Chrome's local storage

2. **Popup Interface** (`popup.html/js/css`) provides:
   - List of all captured chats
   - Chat viewing with formatted messages
   - Export and management options

## Technical Details

- **Manifest V3** compatible
- **DOM-based extraction** (no API calls required)
- **Handles lazy loading** through programmatic scrolling
- **Preserves formatting** including code blocks and lists
- **Local storage only** (no data sent to external servers)

## Limitations

- Only captures currently loaded conversation (doesn't access other chats)
- Requires manual "share" trigger for each capture
- Limited by ChatGPT's DOM structure (may need updates if UI changes)

## Permissions

- `activeTab`: Access to ChatGPT pages when active
- `storage`: Local storage for captured chats

## Privacy

This extension:
- ✅ Stores all data locally on your device
- ✅ Does not send any data to external servers
- ✅ Only accesses ChatGPT pages when you trigger capture
- ✅ No tracking or analytics

## Troubleshooting

**Extension not working?**
- Make sure you're on chatgpt.com or chat.openai.com
- Check that the extension is enabled in chrome://extensions/
- Try refreshing the ChatGPT page

**Not capturing all messages?**
- The extension scrolls to load messages - wait a moment after typing "share"
- Very long conversations may take longer to load completely

**Can't see captured chats?**
- Click the extension icon in your Chrome toolbar
- Check Chrome's local storage isn't full or disabled