import { z } from "zod";
import { ToolContext, ToolResult } from "./index";

// Create snapshot tool
const createSnapshot = {
  name: "create_snapshot",
  description: "Create a filesystem snapshot of the sandbox",
  parameters: z.object({
    description: z.string().optional().describe("Description of the snapshot"),
  }),
  execute: async (params: { description?: string }, ctx: ToolContext): Promise<ToolResult> => {
    try {
      if (!ctx.sandboxId) {
        return { success: false, error: "No sandbox ID provided" };
      }

      const response = await fetch(
        "https://jverre--ttyd-sandbox-create-snapshot.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ctx.modalAuthToken}`,
          },
          body: JSON.stringify({
            sandbox_id: ctx.sandboxId,
            description: params.description || "Automatic snapshot",
          }),
        }
      );

      if (!response.ok) {
        return { success: false, error: `Failed to create snapshot: ${response.statusText}` };
      }

      const data = await response.json();
      return { 
        success: true, 
        data: {
          snapshot_id: data.snapshot_id,
          message: data.message,
          description: params.description,
        }
      };
    } catch (error) {
      return { success: false, error: `Error creating snapshot: ${error}` };
    }
  },
};

// Export all snapshot tools
export const snapshotTools = {
  create_snapshot: createSnapshot,
}; 