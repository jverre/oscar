# Oscar Sandbox - Modal Terminal Service

Creates secure, isolated terminal environments with ttyd and Claude Code pre-installed.

## Features

- 🔒 **Secure Sandboxes**: Modal's gVisor-based isolation
- 🌐 **Web Terminal**: Browser-based terminal via ttyd
- 🤖 **Claude Code**: Pre-installed Claude Code CLI
- 🔐 **Authentication**: Bearer token authentication
- ⚡ **On-Demand**: Auto-scaling containers

## Quick Start

```bash
# Install dependencies
uv add modal

# Create authentication secret
export AUTH_TOKEN=$(openssl rand -hex 32)  
modal secret create auth-token AUTH_TOKEN=$AUTH_TOKEN

# Deploy the service
uv run modal deploy sandbox_manager.py
```

## Usage

### API Endpoint

```bash
curl -X POST https://your-app-url/create_sandbox \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json"
```

### Python Function

```python
from sandbox_manager import create_terminal

result = create_terminal()
print(f"Terminal URL: {result['url']}")
```

### Direct Run

```bash
python sandbox_manager.py
```

## Response

```json
{
  "success": true,
  "terminal_url": "https://encrypted-tunnel-url.modal.host",
  "message": "Sandbox created successfully"
}
```

## Using Claude Code

Once connected to the terminal:

```bash
# Initialize Claude Code
claude auth login

# Start coding with AI assistance
claude code
```

## Configuration

- **Timeout**: 60 seconds default
- **Port**: 7681 (encrypted tunnel)
- **Auth**: Bearer token via Modal secrets

## License

MIT