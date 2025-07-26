import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { createSnapshot } from "./utils";

// Restart service tool
const restartService = {
  name: "restart_service",
  description: "Restart the service by creating a new sandbox from latest snapshot. Use when sandbox is inaccessible or service has failed.",
  parameters: z.object({
    force: z.boolean().optional().describe("Force restart even if health check passes (default: false)"),
    new_port: z.number().optional().describe("Change the port for the restarted service"),
    new_command: z.string().optional().describe("Change the start command for the restarted service"),
  }),
  execute: async (
    params: { force?: boolean; new_port?: number; new_command?: string }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      if (!ctx.sandboxId) {
        return { success: false, error: "No sandbox ID provided" };
      }

      if (!ctx.modalAuthToken) {
        return { success: false, error: "Modal authentication token not configured" };
      }

      // First, check current health unless forced
      if (!params.force) {
        console.log("Checking current sandbox health before restart...");
        
        const healthResponse = await fetch(
          "https://jverre--ttyd-sandbox-health-check.modal.run",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${ctx.modalAuthToken}`,
            },
            body: JSON.stringify({
              sandbox_id: ctx.sandboxId,
              check_service: true,
            }),
          }
        );

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          if (healthData.sandbox_accessible && healthData.service_running) {
            return {
              success: false,
              error: "Service is currently healthy. Use force=true to restart anyway."
            };
          }
        }
      }

      // Get current plugin info to retrieve port and command
      let currentPort = 3000;
      let currentCommand = "npm start";
      
      if (ctx.convexUrl && ctx.authToken) {
        try {
          const statusResponse = await fetch(`${ctx.convexUrl}/getServiceStatus`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: ctx.pluginId,
              organizationId: ctx.organizationId,
            }),
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            // Get plugin data to find current port and command
            if (statusData.plugin) {
              currentPort = statusData.plugin.port || 3000;
              currentCommand = statusData.plugin.startCommand || "npm start";
            }
          }
        } catch (error) {
          console.warn('Could not retrieve current plugin info:', error);
        }
      }

      // Use provided parameters or fall back to current values
      const port = params.new_port || currentPort;
      const command = params.new_command || currentCommand;

      // Create a snapshot of the current state before restart
      const currentSnapshot = await createSnapshot(ctx, `Snapshot before restart: ${command}`);
      
      if (!currentSnapshot) {
        return {
          success: false,
          error: "Failed to create snapshot before restart"
        };
      }

      console.log(`Restarting service with port ${port} and command: ${command}`);

      // Call Modal restart endpoint
      const response = await fetch(
        "https://jverre--ttyd-sandbox-restart-service.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ctx.modalAuthToken}`,
          },
          body: JSON.stringify({
            sandbox_id: ctx.sandboxId,
            snapshot_id: currentSnapshot.id,
            start_command: command,
            port: port,
            plugin_id: ctx.pluginId,
            organization_id: ctx.organizationId,
            user_id: ctx.userId,
          }),
        }
      );

      if (!response.ok) {
        return { 
          success: false, 
          error: `Failed to restart service: ${response.statusText}. Please ensure the Modal sandbox service is deployed and accessible.` 
        };
      }

      const data = await response.json();
      
      if (!data.success) {
        return { 
          success: false, 
          error: data.error || "Failed to restart service" 
        };
      }

      // Create a final snapshot after successful restart
      const finalSnapshot = await createSnapshot(
        { ...ctx, sandboxId: data.new_sandbox_id }, 
        `Snapshot after restart: ${command}`
      );

      // Update plugin with new port and command if they changed
      if (ctx.convexUrl && ctx.authToken && (params.new_port || params.new_command)) {
        try {
          await fetch(`${ctx.convexUrl}/updatePlugin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: ctx.pluginId,
              port: port,
              startCommand: command,
            }),
          });
        } catch (error) {
          console.warn('Failed to update plugin:', error);
        }
      }

      // Update sandbox with new information and increment restart count
      if (ctx.convexUrl && ctx.authToken) {
        try {
          await fetch(`${ctx.convexUrl}/updateSandboxRestart`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: ctx.pluginId,
              organizationId: ctx.organizationId,
              modalSandboxId: data.new_sandbox_id,
              sandboxUrl: data.tunnel_url,
              status: "active",
              serviceStatus: "running",
              lastSnapshot: currentSnapshot.id,
            }),
          });
        } catch (error) {
          console.warn('Failed to update sandbox after restart:', error);
        }
      }

      return {
        success: true,
        data: {
          old_sandbox_id: ctx.sandboxId,
          new_sandbox_id: data.new_sandbox_id,
          tunnel_url: data.tunnel_url,
          service_status: data.service_status,
          port: port,
          command: command,
          restart_reason: params.force ? "forced" : "health check failed",
          snapshots: {
            before: currentSnapshot,
            after: finalSnapshot
          },
          tunnel_info: data.tunnel_info,
          message: `Service restarted successfully on port ${port}`
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Error restarting service: ${error}` 
      };
    }
  },
};

// Export restart tools
export const restartTools = {
  restart_service: restartService,
};