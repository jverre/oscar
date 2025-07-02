# Oscar VS Code Extension

Seamlessly sync your Claude Code chat conversations with Oscar, a powerful LLM chat app that organizes your conversations in folders with file attachments support.

## 🚀 Features

- **Automatic Sync**: Automatically syncs your Claude Code chats to Oscar in real-time
- **File Watching**: Monitors Claude Code projects directory for new conversations
- **Flexible Configuration**: Customize which paths to include/exclude from syncing
- **Authentication**: Secure sign-in integration with Oscar
- **Status Bar Integration**: Quick access to sync status and controls
- **Manual Sync**: Force sync conversations with a single command

## 📥 Installation

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=oscar.oscar)
2. Reload VS Code
3. Sign in to Oscar using the command palette: `Oscar: Sign in to Oscar`

## ⚙️ Configuration

Configure the extension through VS Code settings (`Ctrl+,` or `Cmd+,`):

### Server Settings
- **`oscar.serverUrl`** (default: `http://localhost:3000`)
  - Oscar server URL

### Sync Settings
- **`oscar.autoSync`** (default: `true`)
  - Automatically sync Claude Code chats to Oscar

- **`oscar.sync.minMessages`** (default: `1`)
  - Minimum number of messages required to sync a session

### File Watcher Settings
- **`oscar.fileWatcher.enabled`** (default: `true`)
  - Enable Claude Code file watching for automatic sync

- **`oscar.fileWatcher.claudePath`** (default: auto-detection)
  - Custom path to Claude Code projects directory

### Path Filtering
- **`oscar.sync.includePaths`** (default: `[]`)
  - Only sync sessions from these project paths (leave empty to sync all)

- **`oscar.sync.excludePaths`** (default: `[]`)
  - Exclude sessions from these project paths from syncing

## 🎯 Commands

Access these commands through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **`Oscar: Sign in to Oscar`** - Authenticate with Oscar
- **`Oscar: Sign out of Oscar`** - Sign out from Oscar
- **`Oscar: Sync Claude Code chats now`** - Manually trigger sync
- **`Oscar: Show Oscar menu`** - Open Oscar menu

## 🔧 Getting Started

1. **Install and Configure**
   - Install the extension
   - Configure your Oscar server URL if different from localhost

2. **Sign In**
   - Run `Oscar: Sign in to Oscar` from the Command Palette
   - Complete authentication in the browser

3. **Automatic Sync**
   - The extension will automatically detect and sync your Claude Code conversations
   - Monitor sync status in the VS Code status bar

4. **Customize Sync Behavior**
   - Use include/exclude paths to control which projects sync
   - Adjust minimum message threshold
   - Configure file watcher settings

## 📋 Requirements

- VS Code 1.90.0 or higher
- Oscar server running and accessible
- Claude Code installed and configured

## 🏃‍♂️ How It Works

The Oscar extension monitors your Claude Code projects directory and automatically syncs chat conversations to your Oscar server. It:

1. **Watches** for new Claude Code sessions in your projects
2. **Parses** chat history and metadata
3. **Syncs** conversations to Oscar with proper organization
4. **Maintains** real-time synchronization as you use Claude Code

## 🔐 Privacy & Security

- All communication with Oscar server uses secure authentication
- No chat data is stored locally by the extension
- Sync only occurs with your authenticated Oscar account
- You control which projects are synced through configuration

## 🐛 Troubleshooting

### Extension not syncing
- Check that Oscar server is running and accessible
- Verify you're signed in: run `Oscar: Sign in to Oscar`
- Check VS Code Developer Tools console for errors

### File watcher not detecting changes
- Ensure `oscar.fileWatcher.enabled` is `true`
- Verify Claude Code path detection or set custom path
- Check that Claude Code is creating files in expected locations

### Authentication issues
- Try signing out and back in
- Verify Oscar server URL is correct
- Check that OAuth is properly configured on Oscar server

## 🛠️ Development

Want to contribute? See our development setup:

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd oscar/extensions/vs-code
   npm install
   ```

2. **Debug:**
   - Open the extension directory in VS Code
   - Press `F5` to compile and launch extension host
   - Check Debug Console for logs

3. **Build:**
   ```bash
   npm run compile
   ```

## 📄 License

[License information]

## 🤝 Support

- [GitHub Issues](https://github.com/your-repo/oscar/issues)
- [Documentation](https://your-docs-url.com)

---

Made with ❤️ for the Claude Code community