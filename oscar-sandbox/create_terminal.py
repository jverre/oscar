import modal
import time

# Define the Modal app using lookup
app = modal.App.lookup("ttyd-sandbox", create_if_missing=True)

# Create image with ttyd and necessary dependencies
image = (
    modal.Image.debian_slim()
    .apt_install("curl", "build-essential", "cmake", "git", "vim", "nano")
    .run_commands([
        "curl -L https://github.com/tsl0922/ttyd/releases/download/1.7.3/ttyd.x86_64 -o /usr/local/bin/ttyd",
        "chmod +x /usr/local/bin/ttyd"
    ])
)

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