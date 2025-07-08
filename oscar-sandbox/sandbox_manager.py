import modal
import os
from fastapi import HTTPException, Header, Request

# Define the Modal app using lookup
app = modal.App.lookup("ttyd-sandbox", create_if_missing=True)

# Create image with ttyd and necessary dependencies
image = (
    modal.Image.debian_slim()
    .apt_install("curl", "build-essential", "cmake", "git", "vim", "nano")
    .run_commands([
        # Install Node.js and npm
        "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
        "apt-get install -y nodejs",
        # Install ttyd
        "curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o /usr/local/bin/ttyd",
        "chmod +x /usr/local/bin/ttyd",
        # Install Claude Code
        "npm install -g @anthropic-ai/claude-code"
    ])
)

# Create image for web endpoint with FastAPI
web_image = modal.Image.debian_slim().pip_install("fastapi[standard]")

def create_terminal():
    """
    Create a ttyd terminal sandbox and return the tunnel URL
    """
    # Create sandbox with ttyd running
    sb = modal.Sandbox.create(
        "ttyd", 
        "-p", "7681",
        "-i", "0.0.0.0",
        "/bin/bash",
        image=image,
        encrypted_ports=[7681],
        app=app,
        timeout=3600
    )
    
    # Get the tunnel URL
    tunnel = sb.tunnels()[7681]
    
    print(f"🔗 Terminal available at: {tunnel.url}")
    print("✅ ttyd is running in sandbox")
    print(f"📱 Access your terminal at: {tunnel.url}")
    print("🎯 Sandbox will run for 1 hour or until manually terminated")
    
    return {
        "url": tunnel.url,
        "sandbox": sb
    }

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
def create_sandbox(request: Request):
    """
    Web endpoint to create a new sandbox terminal
    """
    
    def check_auth(request: Request):
        # Get AUTH_TOKEN from environment
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        # Extract token from "Bearer <token>" format
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    # Check authentication
    check_auth(request)
    
    try:
        # Create the terminal
        result = create_terminal()
        
        return {
            "success": True,
            "terminal_url": result["url"],
            "message": "Sandbox created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sandbox: {str(e)}")

if __name__ == "__main__":
    result = create_terminal()
    print(f"\n✅ Terminal created successfully!")
    print(f"🔗 Access at: {result['url']}")