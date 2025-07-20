import modal
import os
import time
from fastapi import HTTPException, Request

app = modal.App.lookup("ttyd-sandbox", create_if_missing=True)


image = (
    modal.Image.debian_slim()
    .apt_install("curl", "build-essential", "cmake", "git", "vim", "nano")
    .run_commands([
        "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
        "apt-get install -y nodejs",
        "mkdir -p /plugin",
    ])
    .add_local_dir(local_path="/root/plugin-template", remote_path="/plugin", copy=True)
    .run_commands([
        # Install dependencies
        "cd /plugin && npm install"
    ])
)

web_image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]")
    .add_local_dir(local_path="./plugin-template", remote_path="/root/plugin-template")
)

def create_blank_sandbox(start_dev_server=False):
    """
    Create a sandbox and optionally start dev server with tunnel
    """
    print(f"[DEBUG] Creating sandbox, start_dev_server: {start_dev_server}")
    
    if start_dev_server:
        # Create sandbox with dev server command
        try:
            sb = modal.Sandbox.create(
                "bash", "-c", 
                "cd /plugin && VITE_HOST_CHECK=false npm run dev -- --host 0.0.0.0",
                image=image,
                encrypted_ports=[5173],
                app=app,
                timeout=3600,
                workdir="/plugin"
            )
            time.sleep(3)
        except Exception as e:
            print(f"[DEBUG] Error creating sandbox: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create sandbox: {str(e)}")
        
        print(f"[DEBUG] Dev server sandbox created: {sb.object_id}")
        
        # Get tunnel URL
        try:
            tunnel = sb.tunnels()[5173]
        except Exception as e:
            print(f"[DEBUG] Error getting tunnel: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get tunnel: {str(e)}")
        
        tunnel_info = {
            "port": 5173,
            "url": tunnel.url,
            "available_ports": [5173]
        }
        
        print(f"[DEBUG] Dev server tunnel: {tunnel.url}")
        
    else:
        # Create basic sandbox
        sb = modal.Sandbox.create(
            image=image,
            app=app,
            timeout=3600,
            workdir="/plugin"
        )
        
        print(f"[DEBUG] Basic sandbox created: {sb.object_id}")
        tunnel_info = None
    
    return {
        "sandbox_id": sb.object_id,
        "sandbox": sb,
        "tunnel_info": tunnel_info
    }

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def create_sandbox(request: Request):
    """
    Web endpoint to create a new blank sandbox
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        start_dev_server = body.get("start_dev_server", False)
        
        result = create_blank_sandbox(start_dev_server=start_dev_server)
        
        return {
            "success": True,
            "sandbox_id": result["sandbox_id"],
            "tunnel_info": result.get("tunnel_info"),
            "message": "Blank sandbox created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create sandbox: {str(e)}")

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def execute_command(request: Request):
    """
    Execute a command on an existing sandbox
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        command = body.get("command")
        
        if not sandbox_id or not command:
            raise HTTPException(status_code=400, detail="sandbox_id and command are required")
        
        try:
            sb = modal.Sandbox.from_id(sandbox_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Sandbox not found: {str(e)}")
        
        if isinstance(command, list):
            process = sb.exec(*command)
        else:
            process = sb.exec("bash", "-c", command)
        
        stdout = process.stdout.read()
        stderr = process.stderr.read()
        returncode = process.wait()
        
        return {
            "success": True,
            "stdout": stdout,
            "stderr": stderr,
            "returncode": returncode
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {str(e)}")


@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def create_snapshot(request: Request):
    """
    Create a filesystem snapshot
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        
        if not sandbox_id:
            raise HTTPException(status_code=400, detail="sandbox_id is required")
        
        try:
            sb = modal.Sandbox.from_id(sandbox_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Sandbox not found: {str(e)}")
        
        snapshot = sb.snapshot_filesystem()
        
        return {
            "success": True,
            "snapshot_id": snapshot.object_id,
            "message": "Snapshot created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create snapshot: {str(e)}")

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def start_service_with_tunnel(request: Request):
    """
    Create a new sandbox from snapshot with tunneling and start a service
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        snapshot_id = body.get("snapshot_id")
        start_command = body.get("start_command")
        port = body.get("port")
        plugin_id = body.get("plugin_id")
        organization_id = body.get("organization_id")
        user_id = body.get("user_id")
        
        if not all([sandbox_id, snapshot_id, start_command, port]):
            raise HTTPException(status_code=400, detail="sandbox_id, snapshot_id, start_command, and port are required")
        
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise HTTPException(status_code=400, detail="port must be an integer between 1 and 65535")
        
        print(f"[DEBUG] Creating new sandbox from snapshot {snapshot_id} with tunnel on port {port}")
        
        # Get the filesystem snapshot image
        try:
            snapshot_image = modal.Image.from_id(snapshot_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Snapshot not found: {str(e)}")
        
        # Create a new sandbox with the specified port for tunneling and start service directly
        # Include common ports and the specified port
        encrypted_ports = [5173, 7681, 8080]
        if port not in encrypted_ports:
            encrypted_ports.append(port)
        
        print(f"[DEBUG] Starting service with command: {start_command}")
        
        new_sb = modal.Sandbox.create(
            "bash", "-c", f"cd /plugin && {start_command}",
            image=snapshot_image,
            encrypted_ports=encrypted_ports,
            app=app,
            timeout=3600,
            workdir="/plugin"
        )
        
        print(f"[DEBUG] New service sandbox created with ID: {new_sb.object_id}")
        
        # Wait a moment for the service to start
        time.sleep(3)
        
        # Get tunnel information
        print(f"[DEBUG] Getting tunnel information for port {port}")
        
        try:
            tunnels = new_sb.tunnels()
            print(f"[DEBUG] Available tunnels: {tunnels}")
            
            if port in tunnels:
                tunnel_url = tunnels[port].url
                print(f"[DEBUG] Tunnel URL for port {port}: {tunnel_url}")
            else:
                print(f"[DEBUG] No tunnel found for port {port}, available ports: {list(tunnels.keys())}")
                tunnel_url = None
        except Exception as e:
            print(f"[DEBUG] Error getting tunnel info: {e}")
            tunnel_url = None
        
        # Service is considered started if sandbox was created successfully
        service_status = "started"
        service_logs = "Service started directly with sandbox"
        
        # Terminate the old sandbox
        try:
            old_sb = modal.Sandbox.from_id(sandbox_id)
            old_sb.terminate()
            print(f"[DEBUG] Terminated old sandbox: {sandbox_id}")
        except Exception as e:
            print(f"[DEBUG] Could not terminate old sandbox: {e}")
        
        return {
            "success": True,
            "new_sandbox_id": new_sb.object_id,
            "tunnel_url": tunnel_url,
            "service_status": service_status,
            "service_logs": service_logs,
            "tunnel_info": {
                "port": port,
                "available_tunnels": list(tunnels.keys()) if 'tunnels' in locals() else [],
            },
            "message": f"New sandbox created with tunnel on port {port}"
        }
        
    except Exception as e:
        print(f"[DEBUG] Exception in start_service_with_tunnel: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to start service with tunnel: {str(e)}")

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def health_check(request: Request):
    """
    Check if sandbox is accessible and optionally check if service is running
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        check_service = body.get("check_service", True)
        port = body.get("port", 5173)
        
        if not sandbox_id:
            raise HTTPException(status_code=400, detail="sandbox_id is required")
        
        print(f"[DEBUG] Health check for sandbox {sandbox_id}, check_service: {check_service}, port: {port}")
        
        start_time = time.time()
        
        try:
            sb = modal.Sandbox.from_id(sandbox_id)
            sandbox_accessible = True
            print(f"[DEBUG] Sandbox {sandbox_id} is accessible")
        except Exception as e:
            print(f"[DEBUG] Sandbox {sandbox_id} is not accessible: {e}")
            return {
                "success": True,
                "sandbox_accessible": False,
                "service_running": False,
                "service_port": port,
                "tunnel_url": None,
                "response_time": (time.time() - start_time) * 1000,
                "error_details": str(e)
            }
        
        service_running = False
        tunnel_url = None
        
        if check_service and sandbox_accessible:
            try:
                # Check if service is running by looking for the process
                process = sb.exec("pgrep", "-f", "npm start")
                process_stdout = process.stdout.read()
                
                if process_stdout.strip():
                    service_running = True
                    print(f"[DEBUG] Service appears to be running (found process)")
                    
                    # Try to get tunnel information
                    try:
                        tunnels = sb.tunnels()
                        if port in tunnels:
                            tunnel_url = tunnels[port].url
                            print(f"[DEBUG] Found tunnel URL: {tunnel_url}")
                    except Exception as e:
                        print(f"[DEBUG] Could not get tunnel info: {e}")
                else:
                    print(f"[DEBUG] No service process found")
                
            except Exception as e:
                print(f"[DEBUG] Error checking service: {e}")
        
        response_time = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "sandbox_accessible": sandbox_accessible,
            "service_running": service_running,
            "service_port": port,
            "tunnel_url": tunnel_url,
            "response_time": response_time,
            "error_details": None
        }
        
    except Exception as e:
        print(f"[DEBUG] Exception in health_check: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def restart_service(request: Request):
    """
    Restart service by creating new sandbox from snapshot and starting service
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        snapshot_id = body.get("snapshot_id")
        start_command = body.get("start_command")
        port = body.get("port")
        plugin_id = body.get("plugin_id")
        organization_id = body.get("organization_id")
        user_id = body.get("user_id")
        
        if not all([sandbox_id, snapshot_id, start_command, port]):
            raise HTTPException(status_code=400, detail="sandbox_id, snapshot_id, start_command, and port are required")
        
        print(f"[DEBUG] Restarting service for sandbox {sandbox_id} with snapshot {snapshot_id}")
        
        # Terminate old sandbox first
        try:
            old_sb = modal.Sandbox.from_id(sandbox_id)
            old_sb.terminate()
            print(f"[DEBUG] Terminated old sandbox: {sandbox_id}")
        except Exception as e:
            print(f"[DEBUG] Could not terminate old sandbox (might already be gone): {e}")
        
        # Get the filesystem snapshot image
        try:
            snapshot_image = modal.Image.from_id(snapshot_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Snapshot not found: {str(e)}")
        
        # Create a new sandbox with the specified port for tunneling and start service directly
        encrypted_ports = [5173, 7681, 8080]
        if port not in encrypted_ports:
            encrypted_ports.append(port)
        
        print(f"[DEBUG] Restarting service with command: {start_command}")
        
        new_sb = modal.Sandbox.create(
            "bash", "-c", f"cd /plugin && {start_command}",
            image=snapshot_image,
            encrypted_ports=encrypted_ports,
            app=app,
            timeout=3600,
            workdir="/plugin"
        )
        
        print(f"[DEBUG] New service sandbox created with ID: {new_sb.object_id}")
        
        # Wait a moment for the service to start
        time.sleep(3)
        
        # Get tunnel information
        try:
            tunnels = new_sb.tunnels()
            tunnel_url = tunnels.get(port, {}).url if port in tunnels else None
        except Exception as e:
            print(f"[DEBUG] Error getting tunnel info: {e}")
            tunnel_url = None
        
        # Service is considered started if sandbox was created successfully
        service_status = "started"
        
        return {
            "success": True,
            "new_sandbox_id": new_sb.object_id,
            "tunnel_url": tunnel_url,
            "service_status": service_status,
            "tunnel_info": {
                "port": port,
                "available_tunnels": list(tunnels.keys()) if 'tunnels' in locals() else [],
            },
            "message": f"Service restarted successfully on port {port}"
        }
        
    except Exception as e:
        print(f"[DEBUG] Exception in restart_service: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to restart service: {str(e)}")

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def terminate_sandbox(request: Request):
    """
    Terminate a sandbox by its ID
    """
    
    def check_auth(request: Request):
        auth_token = os.environ.get("AUTH_TOKEN")
        
        if not auth_token:
            raise HTTPException(status_code=500, detail="AUTH_TOKEN not configured")
        
        authorization = request.headers.get("authorization")
        if not authorization:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization format")
        
        token = authorization.split(" ")[1]
        if token != auth_token:
            raise HTTPException(status_code=403, detail="Invalid token")
    
    check_auth(request)
    
    try:
        body = await request.json()
        sandbox_id = body.get("sandbox_id")
        
        if not sandbox_id:
            raise HTTPException(status_code=400, detail="sandbox_id is required")
        
        try:
            sb = modal.Sandbox.from_id(sandbox_id)
            sb.terminate()
            print(f"[DEBUG] Terminated sandbox: {sandbox_id}")
            
            return {
                "success": True,
                "message": f"Sandbox {sandbox_id} terminated successfully"
            }
        except Exception as e:
            print(f"[DEBUG] Error terminating sandbox: {e}")
            return {
                "success": False,
                "error": f"Failed to terminate sandbox: {str(e)}"
            }
        
    except Exception as e:
        print(f"[DEBUG] Exception in terminate_sandbox: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to terminate sandbox: {str(e)}")

