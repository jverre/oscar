import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { startDescription } from "./start_description";
import { validateSandboxContext, createSnapshot } from "./utils";

// Constants
const MIN_PORT = 1;
const MAX_PORT = 65535;

// Start command update tool
const updateStartCommand = {
  name: "update_start_command",
  description: startDescription,
  parameters: z.object({
    plugin_id: z.string().describe("The ID of the plugin to update"),
    start_command: z.string().describe("The new start command to set"),
    port: z.number()
      .min(MIN_PORT)
      .max(MAX_PORT)
      .describe("The port number the service will run on (1-65535)"),
  }),
  execute: async (
    params: { plugin_id: string; start_command: string; port: number }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Validate plugin_id is provided
      if (!params.plugin_id || params.plugin_id.trim() === '') {
        return {
          success: false,
          error: "plugin_id is required and cannot be empty"
        };
      }

      // Validate start_command is provided
      if (!params.start_command || params.start_command.trim() === '') {
        return {
          success: false,
          error: "start_command is required and cannot be empty"
        };
      }

      // Validate port range
      if (params.port < MIN_PORT || params.port > MAX_PORT) {
        return {
          success: false,
          error: `Port must be between ${MIN_PORT} and ${MAX_PORT}`
        };
      }

      // First, create a snapshot of the current state
      const currentSnapshot = await createSnapshot(ctx, `Snapshot before updating start command for plugin ${params.plugin_id}`);
      
      if (!currentSnapshot) {
        return {
          success: false,
          error: "Failed to create snapshot before updating start command"
        };
      }

      // Call the Modal endpoint to create sandbox with tunneling
      const response = await fetch(
        "https://jverre--ttyd-sandbox-start-service-with-tunnel.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ctx.modalAuthToken}`,
          },
          body: JSON.stringify({
            sandbox_id: ctx.sandboxId,
            snapshot_id: currentSnapshot.id,
            start_command: params.start_command,
            port: params.port,
            plugin_id: params.plugin_id,
            organization_id: ctx.organizationId,
            user_id: ctx.userId,
          }),
        }
      );

      if (!response.ok) {
        return { 
          success: false, 
          error: `Failed to create sandbox with tunnel: ${response.statusText}. Please ensure the Modal sandbox service is deployed and accessible.` 
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return { 
          success: false, 
          error: data.error || "Failed to create sandbox with tunnel" 
        };
      }

      // Create a final snapshot after successful setup
      const finalSnapshot = await createSnapshot(
        { ...ctx, sandboxId: data.new_sandbox_id }, 
        `Snapshot after starting service: ${params.start_command}`
      );

      // Update plugin with new port and start command
      if (ctx.convexUrl && ctx.authToken) {
        try {
          await fetch(`${ctx.convexUrl}/updatePlugin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: params.plugin_id,
              port: params.port,
              startCommand: params.start_command,
            }),
          });
        } catch (error) {
          console.warn('Failed to update plugin:', error);
        }
      }

      // Update sandbox with new URL and status
      if (ctx.convexUrl && ctx.authToken) {
        try {
          await fetch(`${ctx.convexUrl}/updateSandbox`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: params.plugin_id,
              organizationId: ctx.organizationId,
              modalSandboxId: data.new_sandbox_id,
              sandboxUrl: data.tunnel_url,
              status: "active",
            }),
          });
        } catch (error) {
          console.warn('Failed to update sandbox:', error);
        }
      }

      return {
        success: true,
        data: {
          plugin_id: params.plugin_id,
          start_command: params.start_command,
          port: params.port,
          old_sandbox_id: ctx.sandboxId,
          new_sandbox_id: data.new_sandbox_id,
          sandbox_url: data.tunnel_url,
          service_status: data.service_status,
          tunnel_info: data.tunnel_info,
          snapshots: {
            before: currentSnapshot,
            after: finalSnapshot
          },
          message: "Start command updated and service started with tunnel successfully"
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Error updating start command: ${error}` 
      };
    }
  },
};

// Export start tools
export const startTools = {
  update_start_command: updateStartCommand,
};