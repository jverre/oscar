import { ToolContext, ToolResult } from "./index";

/**
 * Validates that the required context properties are available for sandbox operations
 */
export function validateSandboxContext(ctx: ToolContext): ToolResult | null {
  if (!ctx.sandboxId) {
    return { 
      success: false, 
      data: null,
      error: "No active sandbox available. Please create a sandbox first to use this tool." 
    };
  }

  if (!ctx.modalAuthToken) {
    return {
      success: false,
      data: null,
      error: "Modal authentication token not configured. Please check server configuration."
    };
  }

  return null; // No error, validation passed
}

/**
 * Creates a snapshot of the sandbox with the given description
 */
export async function createSnapshot(
  ctx: ToolContext, 
  description: string
): Promise<{ id: string; message: string } | null> {
  try {
    const snapshotResponse = await fetch(
      "https://jverre--ttyd-sandbox-create-snapshot.modal.run",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ctx.modalAuthToken}`,
        },
        body: JSON.stringify({
          sandbox_id: ctx.sandboxId,
          description: description,
        }),
      }
    );

    if (snapshotResponse.ok) {
      const snapshotResult = await snapshotResponse.json();
      return {
        id: snapshotResult.snapshot_id,
        message: snapshotResult.message
      };
    }
    
    return null;
  } catch (error) {
    // Log the error but don't fail the main operation
    console.warn("Failed to create snapshot:", error);
    return null;
  }
}

/**
 * Executes a command in the sandbox using the Modal API
 */
export async function executeCommand(
  ctx: ToolContext,
  command: string,
  timeoutSeconds?: number
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const body: any = {
      sandbox_id: ctx.sandboxId,
      command: command,
    };

    if (timeoutSeconds) {
      body.timeout = timeoutSeconds;
    }

    const response = await fetch(
      "https://jverre--ttyd-sandbox-execute-command.modal.run",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ctx.modalAuthToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      return { 
        success: false, 
        data: null,
        error: `Failed to execute command: ${response.statusText}` 
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      data: null,
      error: `Error executing command: ${error}` 
    };
  }
}