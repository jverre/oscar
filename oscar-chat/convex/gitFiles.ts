import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simple file structure for Git repositories
export interface GitFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
}

// Get file structure for a Git repository
export const getRepoFiles = action({
  args: {
    fileId: v.id("files"),
    path: v.optional(v.string()), // Optional subdirectory path
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the file record to verify ownership and get metadata
    const file = await ctx.runQuery(internal.files.getFileInternal, {
      fileId: args.fileId,
      userId: userId,
    });

    if (!file) {
      throw new Error("Repository not found");
    }

    const metadata = file.metadata as any;
    if (!metadata?.gitRepoUrl) {
      throw new Error("Not a Git repository");
    }

    // Check clone status
    if (metadata.cloneStatus === "pending") {
      return {
        status: "cloning",
        message: "Repository is being cloned...",
        files: [],
      };
    }

    if (metadata.cloneStatus === "cloning") {
      return {
        status: "cloning", 
        message: "Repository clone in progress...",
        files: [],
      };
    }

    if (metadata.cloneStatus === "error") {
      return {
        status: "error",
        message: metadata.error || "Failed to clone repository",
        files: [],
      };
    }

    if (metadata.cloneStatus !== "completed") {
      return {
        status: "error",
        message: "Repository clone status unknown",
        files: [],
      };
    }

    // Get the machine ID and repo path
    const machineId = metadata.machineId;
    const repoPath = metadata.repoPath || `/repos/${metadata.owner}/${metadata.repo}`;
    
    console.log(`Repository metadata:`, {
      machineId,
      repoPath,
      owner: metadata.owner,
      repo: metadata.repo,
      cloneStatus: metadata.cloneStatus,
      allMetadata: metadata
    });
    
    if (!machineId) {
      throw new Error("Machine ID not found for repository");
    }

    try {
      // First, let's check what directories actually exist
      console.log(`Checking what directories exist in /repos`);
      const lsResult = await ctx.runAction(internal.flyApi.execCommand, {
        machineId,
        command: ["ls", "-la", "/repos"]
      });
      console.log(`/repos directory listing:`, lsResult);

      // Get the entire repository structure at once
      console.log(`Getting entire repository structure for: ${repoPath}`);
      
      // Use find to get all files and directories recursively
      const command = [
        "find", 
        repoPath,
        "(",
        "-type", "f",
        "-o", 
        "-type", "d",
        ")",
        "-printf", "%y|%P|%s\\n"  // %P = relative path from starting point
      ];
      console.log(`NEW RECURSIVE Find command:`, command);
      
      const result: any = await ctx.runAction(internal.flyApi.execCommand, {
        machineId,
        command
      });
      
      console.log(`Find command result:`, result);
      console.log(`Raw stdout length:`, result.stdout?.length || 0);
      console.log(`First 1000 chars of stdout:`, result.stdout?.substring(0, 1000));

      if (result.exit_code !== 0) {
        console.error(`Find command failed with exit code ${result.exit_code}:`, result.stderr);
        return {
          status: "error",
          message: `Failed to access repository: ${result.stderr}`,
          files: [],
        };
      }

      // Parse the find output into a simple list
      const files = parseRepositoryFiles(result.stdout || "");
      console.log(`Final parsed files (${files.length} items):`, files.slice(0, 10)); // Log first 10 for brevity
      console.log(`File types breakdown:`, files.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {} as Record<string, number>));

      return {
        status: "success",
        files: files,
      };

    } catch (error) {
      console.error("Failed to get repository files:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch files",
        files: [],
      };
    }
  },
});

// Helper function to parse find command output into a flat list
function parseRepositoryFiles(output: string): GitFileNode[] {
  console.log(`Parsing repository files from output`);
  
  const lines = output.trim().split('\n').filter(line => line.length > 0);
  console.log(`Processing ${lines.length} lines`);
  console.log(`Sample lines:`, lines.slice(0, 20));
  
  const files: GitFileNode[] = [];
  let fileCount = 0;
  let dirCount = 0;
  
  for (const line of lines) {
    const parts = line.split('|');
    console.log(`Processing line: "${line}" -> parts:`, parts);
    
    if (parts.length < 3) {
      console.log(`Skipping line with ${parts.length} parts`);
      continue;
    }

    const [type, relativePath, sizeStr] = parts;
    
    // Skip empty paths or current directory
    if (!relativePath || relativePath === '.' || relativePath === '') {
      console.log(`Skipping empty/current path: "${relativePath}"`);
      continue;
    }
    
    const size = type === 'f' ? parseInt(sizeStr, 10) : undefined;
    const pathParts = relativePath.split('/');
    const name = pathParts[pathParts.length - 1];

    if (type === 'f') fileCount++;
    else if (type === 'd') dirCount++;

    files.push({
      name,
      path: relativePath,
      type: type === 'd' ? 'directory' : 'file',
      size,
    });
    
    console.log(`Added ${type === 'd' ? 'directory' : 'file'}: ${name} (${relativePath})`);
  }

  // Sort by path to maintain directory structure
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  console.log(`Parsed ${files.length} total items: ${fileCount} files, ${dirCount} directories`);
  return files;
}

// Get repository information and clone status
export const getRepoInfo = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("Repository not found");
    }

    // Check if user has access to this file
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("Repository not found or access denied");
    }

    const metadata = file.metadata as any;
    
    return {
      name: file.name,
      repoUrl: metadata?.gitRepoUrl,
      owner: metadata?.owner,
      repo: metadata?.repo,
      cloneStatus: metadata?.cloneStatus || "unknown",
      clonedAt: metadata?.clonedAt,
      error: metadata?.error,
      machineId: metadata?.machineId,
    };
  },
});