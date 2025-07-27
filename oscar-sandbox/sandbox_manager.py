import modal
import os
import time
from fastapi import HTTPException, Request

app = modal.App.lookup("ttyd-sandbox", create_if_missing=True)


web_image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]")
    .add_local_dir(local_path="./plugin-template", remote_path="/root/plugin-template")
)

def create_sandbox_from_snapshot(snapshot_id):
    """
    Create a sandbox from a snapshot
    """
    print(f"[DEBUG] Creating sandbox from snapshot {snapshot_id}")
    
    try:
        # Get the snapshot image
        snapshot_image = modal.Image.from_id(snapshot_id)
        
        # Create sandbox with dev server command
        sb = modal.Sandbox.create(
            "bash", "-c", 
            "cd /plugin && VITE_HOST_CHECK=false npm run dev -- --host 0.0.0.0",
            image=snapshot_image,
            encrypted_ports=[5173],
            app=app,
            timeout=3600,
            workdir="/plugin"
        )
        time.sleep(3)
        
        try:
            tunnel_url = sb.tunnels()[5173].url
            print(f"[DEBUG] Created tunnel: {tunnel_url}")
        except Exception as e:
            print(f"[DEBUG] Error getting tunnel: {e}")
            tunnel_url = None
        
        return {
            "sandbox_id": sb.object_id,
            "sandbox": sb,
            "tunnel_info": {
                "tunnel_url": tunnel_url,
                "port": 5173
            }
        }
    except Exception as e:
        print(f"[DEBUG] Error creating sandbox from snapshot: {e}")
        raise e

@app.function(image=web_image, secrets=[modal.Secret.from_name("auth-token")])
@modal.fastapi_endpoint(method="POST")
async def create_sandbox(request: Request):
    """
    Web endpoint to create a new sandbox (blank or from template)
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
        snapshot_id = body.get("snapshot_id")
        
        result = create_sandbox_from_snapshot(snapshot_id=snapshot_id)
        message = f"Sandbox created from snapshot '{snapshot_id}' successfully"
        
        return {
            "success": True,
            "sandbox_id": result["sandbox_id"],
            "tunnel_info": result.get("tunnel_info"),
            "message": message
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
        workdir = body.get("workdir")
        
        if not sandbox_id or not command:
            raise HTTPException(status_code=400, detail="sandbox_id and command are required")
        
        try:
            sb = modal.Sandbox.from_id(sandbox_id)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Sandbox not found: {str(e)}")
        
        # Handle workdir parameter similar to Convex tool
        if workdir:
            # Convert absolute paths to relative paths (remove leading slash)
            workdir_processed = workdir[1:] if workdir.startswith('/') else workdir
            command = f'cd "{workdir_processed}" && {command}'
        
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

