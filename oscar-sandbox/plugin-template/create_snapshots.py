#!/usr/bin/env python3

import json
import modal

app = modal.App.lookup("create-snapshots", create_if_missing=True)

def create_template_snapshot(template_name="default"):
    """
    Create a snapshot for a specific plugin template
    """
    print(f"Creating snapshot for template: {template_name}")
    template_path = f"./{template_name}"
    
    image = (
        modal.Image.debian_slim()
        .apt_install("curl", "build-essential", "cmake", "git", "vim", "nano")
        .run_commands([
            "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
            "apt-get install -y nodejs",
            "mkdir -p /plugin",
        ])
        .add_local_dir(local_path=template_path, remote_path="/plugin", copy=True)
        .run_commands([
            # Install dependencies
            "cd /plugin && npm install"
        ])
    )
    
    # Create sandbox and take snapshot
    print(f"Creating sandbox...")
    sb = modal.Sandbox.create("bash", "-c", "sleep infinity", image=image, app=app, timeout=60, workdir="/plugin")
    print(f"✓ Sandbox created: {sb.object_id}")
    
    # Wait a moment for sandbox to be ready
    print("Taking snapshot...")
    import time
    time.sleep(2)
    
    # Take snapshot
    snapshot = sb.snapshot_filesystem()
    snapshot_id = snapshot.object_id
    print(f"✓ Snapshot created: {snapshot_id}")
    
    # Terminate sandbox
    sb.terminate()
    print(f"✓ Sandbox terminated")
    
    return snapshot_id

def update_constants_file(snapshots):
    """Update the constants.ts file with new snapshot IDs"""
    constants_path = "../../oscar-chat/convex/constants.ts"
    
    # Define file extensions for each template
    file_extensions = {
        "blog": "md",
        "canvas": "canvas", 
        "xterm": "sh"
    }
    
    # Build the new MARKETPLACE_PLUGINS object
    plugins_code = "export const MARKETPLACE_PLUGINS = {\n"
    for template, snapshot_id in snapshots.items():
        plugins_code += f'  {template}: {{\n'
        plugins_code += f'    name: "{template}",\n'
        plugins_code += f'    fileExtension: ".{file_extensions.get(template, "txt")}",\n'
        plugins_code += f'    snapshotId: "{snapshot_id}",\n'
        plugins_code += f'    isActive: true\n'
        plugins_code += f'  }},\n'
    plugins_code = plugins_code.rstrip(',\n') + '\n};'
    
    try:
        # Read the current constants file
        with open(constants_path, "r") as f:
            content = f.read()
        
        # Find and replace the MARKETPLACE_PLUGINS section
        import re
        # Match the entire MARKETPLACE_PLUGINS object including nested braces
        pattern = r'export const MARKETPLACE_PLUGINS = \{(?:[^{}]|\{[^{}]*\})*\};'
        replacement = plugins_code
        
        new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        # Write back the updated content
        with open(constants_path, "w") as f:
            f.write(new_content)
        
        print(f"✓ Updated {constants_path}")
        
    except Exception as e:
        print(f"✗ Error updating constants file: {e}")

def main():
    templates = ["blog", "canvas", "xterm"]
    snapshots = {}
    
    for template in templates:
        print(f"\n{'='*50}")
        print(f"Processing template: {template}")
        print(f"{'='*50}")
        
        # Create template snapshot
        try:
            snapshot_id = create_template_snapshot(template)
            snapshots[template] = snapshot_id
        except Exception as e:
            print(f"✗ Error creating image for {template}: {e}")
    
    print(f"\n{'='*50}")
    print("RESULTS")
    print(f"{'='*50}")
    print("Template Snapshots:")
    for template, snapshot_id in snapshots.items():
        print(f"  {template}: {snapshot_id}")
    
    # Save to file
    with open("plugin_snapshots.json", "w") as f:
        json.dump(snapshots, f, indent=2)
    
    print(f"\nSnapshot IDs saved to plugin_snapshots.json")
    
    # Update constants.ts file
    update_constants_file(snapshots)

if __name__ == "__main__":
    main()