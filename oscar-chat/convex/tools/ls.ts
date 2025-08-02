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
      // Validate required parameters
      if (!params.path) {
        return { 
          success: false, 
          data: null,
          error: "Missing required parameter: path. Please provide the absolute path to the directory to list." 
        };
      }

      // Validate sandbox context
      const validationError = validateSandboxContext(ctx);
      if (validationError) {
        return validationError;
      }

      // Validate that path is absolute
      if (!params.path.startsWith('/')) {
        return {
          success: false,
          data: null,
          error: "Path must be absolute (start with /), not relative"
        };
      }

      // Check if directory exists
      const checkResult = await executeCommand(ctx, `test -d "${params.path}" && echo "exists" || echo "notfound"`);
      
      if (!checkResult.success) {
        return { success: false, data: null, error: checkResult.error };
      }

      if (checkResult.data.stdout.trim() === "notfound") {
        return { success: false, data: null, error: `Directory not found: ${params.path}` };
      }

      // Combine default ignore patterns with user-provided ones
      const allIgnorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(params.ignore || [])];
      
      // Create find command with ignore patterns - only files, not directories
      let findCommand = `find "${params.path}" -maxdepth 3 -type f`;
      
      // Add ignore patterns using -not -path
      for (const pattern of allIgnorePatterns) {
        if (pattern.includes('*')) {
          findCommand += ` -not -path "*${pattern.replace('*', '')}*"`;
        } else {
          findCommand += ` -not -path "*/${pattern}/*"`;
        }
      }
      
      // Sort results alphabetically (case-insensitive) and limit
      findCommand += ' | sort -f | head -100';

      const listResult = await executeCommand(ctx, findCommand);
      
      if (!listResult.success) {
        return { success: false, data: null, error: listResult.error };
      }

      if (listResult.data.returncode !== 0) {
        return { success: false, data: null, error: `Failed to list directory: ${listResult.data.stderr}` };
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
      return { success: false, data: null, error: `Error listing directory: ${error}` };
    }
  },
};

// Helper function to format output in a tree-like structure
function formatTreeOutput(rootPath: string, files: string[]): string {
  if (files.length === 0) {
    return `${rootPath}/\n  (empty directory)`;
  }

  const lines = [`${rootPath}/`];
  
  // Build a tree structure from file paths
  const tree: Record<string, Set<string>> = {};
  const allDirs = new Set<string>();
  
  for (const file of files) {
    const relativePath = file.replace(rootPath, '').replace(/^\//, '');
    if (!relativePath) continue;
    
    const parts = relativePath.split('/');
    
    // Track all parent directories
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      allDirs.add(currentPath);
    }
    
    // Add file to its immediate parent
    const parentDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (!tree[parentDir]) {
      tree[parentDir] = new Set();
    }
    tree[parentDir].add(parts[parts.length - 1]);
  }
  
  // Add empty directories to tree
  for (const dir of allDirs) {
    const parentDir = dir.includes('/') ? dir.substring(0, dir.lastIndexOf('/')) : '';
    if (!tree[parentDir]) {
      tree[parentDir] = new Set();
    }
    const dirName = dir.includes('/') ? dir.substring(dir.lastIndexOf('/') + 1) : dir;
    tree[parentDir].add(dirName + '/');
  }
  
  // Recursive function to print tree
  function printTree(path: string, indent: number) {
    const items = tree[path];
    if (!items) return;
    
    const sortedItems = Array.from(items).sort((a, b) => {
      // Directories first, then files
      const aIsDir = a.endsWith('/');
      const bIsDir = b.endsWith('/');
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    for (const item of sortedItems) {
      lines.push(`${'  '.repeat(indent + 1)}${item}`);
      
      if (item.endsWith('/')) {
        const subPath = path ? `${path}/${item.slice(0, -1)}` : item.slice(0, -1);
        printTree(subPath, indent + 1);
      }
    }
  }
  
  printTree('', 0);
  
  return lines.join('\n');
}

// Export ls tools
export const lsTools = {
  ls: listDirectory,
};