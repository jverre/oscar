import { z } from "zod";
import { ToolContext, ToolResult } from "./index";

// Health check tool
const checkSandboxHealth = {
  name: "check_sandbox_health",
  description: "Check if sandbox is accessible and service is running. Returns sandbox and service status.",
  parameters: z.object({
    check_service: z.boolean().optional().describe("Whether to check if the service is running on the specified port (default: true)"),
    port: z.number().optional().describe("Port to check service on (defaults to plugin port)"),
  }),
  execute: async (
    params: { check_service?: boolean; port?: number }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      if (!ctx.sandboxId) {
        return { success: false, error: "No sandbox ID provided" };
      }

      if (!ctx.modalAuthToken) {
        return { success: false, error: "Modal authentication token not configured" };
      }

      // Call Modal health check endpoint
      const response = await fetch(
        "https://jverre--ttyd-sandbox-health-check.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ctx.modalAuthToken}`,
          },
          body: JSON.stringify({
            sandbox_id: ctx.sandboxId,
            check_service: params.check_service !== false, // Default to true
            port: params.port, // Optional port to check
          }),
        }
      );

      if (!response.ok) {
        return { 
          success: false, 
          error: `Health check failed: ${response.statusText}` 
        };
      }

      const data = await response.json();
      
      // Update sandbox health check timestamp via HTTP
      if (ctx.convexUrl && ctx.authToken) {
        try {
          await fetch(`${ctx.convexUrl}/updateSandboxHealth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ctx.authToken}`,
            },
            body: JSON.stringify({
              pluginId: ctx.pluginId,
              organizationId: ctx.organizationId,
              sandboxAccessible: data.sandbox_accessible,
              serviceRunning: data.service_running,
              lastHealthCheck: Date.now(),
            }),
          });
        } catch (error) {
          console.warn('Failed to update sandbox health:', error);
        }
      }

      return {
        success: true,
        data: {
          sandbox_accessible: data.sandbox_accessible,
          service_running: data.service_running,
          service_port: data.service_port,
          tunnel_url: data.tunnel_url,
          response_time: data.response_time,
          error_details: data.error_details,
          last_check: Date.now(),
          message: data.sandbox_accessible 
            ? (data.service_running ? "Sandbox and service are healthy" : "Sandbox accessible but service not running")
            : "Sandbox is not accessible"
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Error checking sandbox health: ${error}` 
      };
    }
  },
};

// Get service status tool
const getServiceStatus = {
  name: "get_service_status",
  description: "Get current service status from database without performing active health check.",
  parameters: z.object({}),
  execute: async (
    params: {}, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      if (!ctx.convexUrl || !ctx.authToken) {
        return { success: false, error: "Convex URL or auth token not configured" };
      }

      // Get service status via HTTP
      const response = await fetch(`${ctx.convexUrl}/getServiceStatus`, {
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

      if (!response.ok) {
        return { 
          success: false, 
          error: `Failed to get service status: ${response.statusText}` 
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          sandbox_status: data.status,
          service_status: data.serviceStatus,
          sandbox_url: data.sandboxUrl,
          last_health_check: data.lastHealthCheck,
          restart_count: data.restartCount || 0,
          created_at: data.createdAt,
          expires_at: data.expiresAt,
          message: `Service status: ${data.serviceStatus || 'unknown'}, Sandbox status: ${data.status}`
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Error getting service status: ${error}` 
      };
    }
  },
};

// Export health tools
export const healthTools = {
  check_sandbox_health: checkSandboxHealth,
  get_service_status: getServiceStatus,
};