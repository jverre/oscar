import { z } from "zod";
import { ToolContext, ToolResult } from "./index";
import { lsDescription } from "./ls_description";
import { validateSandboxContext, executeCommand } from "./utils";

// Default ignore patterns for common directories/files
const DEFAULT_IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".turbo",
  ".DS_Store",
  "*.log",
  ".env*",
  ".cache",
  "coverage",
  ".nyc_output",
  "__pycache__",
  "*.pyc",
  ".venv",
  "venv",
  ".terraform",
  ".idea",
  ".vscode",
  "*.swp",
  "*.swo",
  "*~"
];

// LS tool for listing directories and files
const listDirectory = {
  name: "ls",
  description: lsDescription,
  parameters: z.object({
    path: z.string().describe("The absolute path to the directory to list (must be absolute, not relative)"),
    ignore: z.array(z.string()).optional().describe("List of glob patterns to ignore"),
  }),
  execute: async (
    params: { path: string; ignore?: string[] }, 
    ctx: ToolContext
  ): Promise<ToolResult> => {
    try {
      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Validate that path is absolute
      if (!params.path.startsWith('/')) {
        return {
          success: false,
          error: "Path must be absolute (start with /), not relative"
        };
      }

      // Check if directory exists
      const checkResult = await executeCommand(ctx, `test -d "${params.path}" && echo "exists" || echo "notfound"`);
      
      if (!checkResult.success) {
        return { success: false, error: checkResult.error };
      }

      if (checkResult.data.stdout.trim() === "notfound") {
        return { success: false, error: `Directory not found: ${params.path}` };
      }

      // Combine default ignore patterns with user-provided ones
      const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(params.ignore || [])];
      
      // Create find command with ignore patterns
      let findCommand = `find "${params.path}" -maxdepth 3 -type f -o -type d`;
      
      // Add ignore patterns using -not -path
      for (const pattern of allIgnorePatterns) {
        if (pattern.includes('*')) {
          findCommand += ` -not -path "*${pattern.replace('*', '')}*"`;
        } else {
          findCommand += ` -not -path "*/${pattern}/*" -not -name "${pattern}"`;
        }
      }
      
      // Sort and limit results
      findCommand += ' | sort | head -100';

      const listResult = await executeCommand(ctx, findCommand);
      
      if (!listResult.success) {
        return { success: false, error: listResult.error };
      }

      if (listResult.data.returncode !== 0) {
        return { success: false, error: `Failed to list directory: ${listResult.data.stderr}` };
      }

      const output = listResult.data.stdout.trim();
      const lines = output ? output.split('\n') : [];
      
      // Filter out the root directory from results
      const filteredLines = lines.filter((line: any) => line !== params.path);
      
      // Format the output in a tree-like structure
      const formattedOutput = formatTreeOutput(params.path, filteredLines);
      
      // Check if results were truncated (hit the 100 file limit)
      const wasTruncated = lines.length >= 100;

      return {
        success: true,
        data: {
          path: params.path,
          files: filteredLines,
          count: filteredLines.length,
          truncated: wasTruncated,
          output: formattedOutput,
          ignore_patterns: allIgnorePatterns.length > DEFAULT_IGNORE_PATTERNS.length ? params.ignore : undefined
        }
      };
    } catch (error) {
      return { success: false, error: `Error listing directory: ${error}` };
    }
  },
};

// Helper function to format output in a tree-like structure
function formatTreeOutput(rootPath: string, files: string[]): string {
  if (files.length === 0) {
    return `${rootPath}/\n  (empty directory)`;
  }

  const lines = [`${rootPath}/`];
  
  // Group files by their immediate parent directory
  const filesByDir: Record<string, string[]> = {};
  
  for (const file of files) {
    const relativePath = file.replace(rootPath, '').replace(/^\//, '');
    if (!relativePath) continue;
    
    const parts = relativePath.split('/');
    const dirKey = parts.length > 1 ? parts[0] : '';
    
    if (!filesByDir[dirKey]) {
      filesByDir[dirKey] = [];
    }
    filesByDir[dirKey].push(relativePath);
  }
  
  // Sort directories and files
  const sortedDirs = Object.keys(filesByDir).sort();
  
  for (const dir of sortedDirs) {
    const items = filesByDir[dir].sort();
    
    if (dir === '') {
      // Files in root directory
      for (const item of items) {
        if (!item.includes('/')) {
          lines.push(`  ${item}`);
        }
      }
    } else {
      // Directory
      lines.push(`  ${dir}/`);
      
      // Show a few files in the directory
      const filesInDir = items.filter(item => item.startsWith(dir + '/'));
      const displayCount = Math.min(3, filesInDir.length);
      
      for (let i = 0; i < displayCount; i++) {
        const fileName = filesInDir[i].replace(dir + '/', '');
        if (!fileName.includes('/')) {
          lines.push(`    ${fileName}`);
        }
      }
      
      if (filesInDir.length > displayCount) {
        lines.push(`    ... and ${filesInDir.length - displayCount} more`);
      }
    }
  }
  
  return lines.join('\n');
}

// Export ls tools
export const lsTools = {
  ls: listDirectory,
};