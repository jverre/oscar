import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { writeDescription } from "./write_description";
import { validateSandboxContext, createSnapshot, executeCommand } from "./utils";

// Write tool for creating/overwriting files
const writeFile = {
  name: "write",
  description: writeDescription,
  parameters: z.object({
    file_path: z.string().describe("The absolute path to the file to write (must be absolute, not relative)"),
    content: z.string().describe("The content to write to the file"),
  }),
  execute: async (
    params: { file_path: string; content: string }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Check if file already exists
      const checkResult = await executeCommand(ctx, `test -f "${params.file_path}" && echo "exists" || echo "new"`);
      
      if (!checkResult.success) {
        return { success: false, error: checkResult.error };
      }

      const fileExists = checkResult.data.stdout.trim() === "exists";
      
      // Create parent directories if they don't exist
      const dirname = params.file_path.split('/').slice(0, -1).join('/');
      if (dirname) {
        const mkdirResult = await executeCommand(ctx, `mkdir -p "${dirname}"`);
        if (!mkdirResult.success) {
          return { success: false, error: `Failed to create parent directories: ${mkdirResult.error}` };
        }
      }

      // Write the file content
      const writeResult = await executeCommand(ctx, `cat > "${params.file_path}" << 'EOF'\\n${params.content}\\nEOF`);
      
      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      if (writeResult.data.returncode !== 0) {
        return { success: false, error: `Failed to write file: ${writeResult.data.stderr}` };
      }

      // Verify the file was written correctly
      const verifyResult = await executeCommand(ctx, `test -f "${params.file_path}" && echo "success" || echo "failed"`);
      
      if (!verifyResult.success || verifyResult.data.stdout.trim() !== "success") {
        return { success: false, error: "File write verification failed" };
      }

      // Create a snapshot after writing the file
      const snapshotResult = await createSnapshot(ctx, `Snapshot after writing ${params.file_path}`);

      return {
        success: true,
        data: {
          file_path: params.file_path,
          content_length: params.content.length,
          file_existed: fileExists,
          action: fileExists ? "overwritten" : "created",
          message: fileExists ? "File overwritten successfully" : "File created successfully",
          snapshot: snapshotResult
        }
      };
    } catch (error) {
      return { success: false, error: `Error writing file: ${error}` };
    }
  },
};

// Export write tools
export const writeTools = {
  write: writeFile,
};