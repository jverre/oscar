import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Create a new Git folder from a GitHub repo URL and clone it to Fly.io machine
export const createGitFolder = mutation({
  args: {
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Support both formats: full URL and short format (user/repo)
    let normalizedUrl: string;
    
    // Check if it's already a full GitHub URL
    const fullUrlRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?\/?$/;
    if (fullUrlRegex.test(args.repoUrl)) {
      normalizedUrl = args.repoUrl;
    } else {
      // Check if it's short format (user/repo)
      const shortFormatRegex = /^[^/\s]+\/[^/\s]+$/;
      if (shortFormatRegex.test(args.repoUrl)) {
        normalizedUrl = `https://github.com/${args.repoUrl}`;
      } else {
        throw new Error("Invalid format. Please use: https://github.com/user/repo or user/repo");
      }
    }

    // Extract owner and repo from normalized URL
    const githubUrlRegex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\.git)?\/?$/;
    const match = normalizedUrl.match(githubUrlRegex);
    if (!match) {
      throw new Error("Invalid GitHub repository URL format");
    }

    const [, owner, repo] = match;
    const gitFolderName = `${owner}/${repo}.git`;

    // Get the user to find their organization and team
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the user's team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .first();
    
    if (!team) {
      throw new Error("Team not found for user's organization");
    }

    // Check if a Git folder with this name already exists
    const existingFile = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", user.organizationId)
         .eq("teamId", team._id)
         .eq("name", gitFolderName)
      )
      .first();

    if (existingFile) {
      throw new Error(`Repository "${gitFolderName}" is already cloned. Please choose a different repository.`);
    }

    const now = Date.now();

    // Create the file record first
    const fileId = await ctx.db.insert("files", {
      organizationId: user.organizationId,
      teamId: team._id,
      name: gitFolderName,
      lastMessageAt: now,
      createdAt: now,
      isStreaming: false,
      visibility: "private", // Git repos are private by default
      metadata: {
        gitRepoUrl: normalizedUrl,
        owner,
        repo,
        cloneStatus: "pending",
      },
    });

    // Schedule the actual cloning operation
    await ctx.scheduler.runAfter(0, internal.files.cloneRepository, {
      fileId,
      repoUrl: normalizedUrl,
      owner,
      repo,
      userId,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createFileEvent, {
      userId,
      eventType: "create_file",
      fileId,
      fileName: gitFolderName,
    });

    return fileId;
  },
});

// Internal helper mutation to update file metadata
export const updateFileMetadata = internalMutation({
  args: {
    fileId: v.id("files"),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      metadata: args.metadata,
    });
  },
});

// Internal action to handle the actual repository cloning
export const cloneRepository = internalAction({
  args: {
    fileId: v.id("files"),
    repoUrl: v.string(),
    owner: v.string(),
    repo: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Update file status to cloning
      await ctx.runMutation(internal.files.updateFileMetadata, {
        fileId: args.fileId,
        metadata: {
          gitRepoUrl: args.repoUrl,
          owner: args.owner,
          repo: args.repo,
          cloneStatus: "cloning",
        },
      });

      // Get or create user's Fly.io machine
      // Query machines directly from the action context
      const machines = await ctx.runQuery(internal.flyMachines.getUserMachines, {
        userId: args.userId,
      });
      
      const runningMachine = machines.find((m: any) => m.status === "running");
      const stoppedMachine = machines.find((m: any) => m.status === "stopped");
      let machineId: string;
      
      if (runningMachine) {
        // Reuse existing running machine
        console.log(`Reusing running machine: ${runningMachine.machineId}`);
        machineId = runningMachine.machineId;
      } else if (stoppedMachine) {
        // Restart stopped machine
        console.log(`Restarting stopped machine: ${stoppedMachine.machineId}`);
        machineId = stoppedMachine.machineId;
        
        // Start the stopped machine
        await ctx.runAction(internal.flyApi.startMachine, {
          machineId,
        });
        
        // Update machine status in database
        await ctx.runMutation(internal.flyMachines.updateMachineStatusInternal, {
          machineId,
          status: "running",
        });
      } else {
        // Create new machine only if no existing machines found
        console.log(`Creating new machine for user ${args.userId}`);
        const newMachine = await ctx.runAction(internal.flyApi.createMachine, {
          userId: args.userId,
        });
        machineId = newMachine.machineId;
      }

      // Wait for machine to be ready (only if we created a new machine or restarted a stopped one)
      if (!runningMachine) {
        console.log(`Waiting for machine ${machineId} to be ready...`);
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts = ~5 minutes
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          
          const status = await ctx.runAction(internal.flyApi.getMachineStatus, {
            machineId,
          });
          
          console.log(`Machine status check attempt ${attempts + 1}: ${status.state}`);
          
          if (status.state === "started" || status.state === "running") {
            console.log(`Machine is ready with state: ${status.state}`);
            break;
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          throw new Error("Machine failed to start within timeout");
        }
      }

      // Clone the repository in background
      const repoPath = `/repos/${args.owner}/${args.repo}`;
      const logFile = `/tmp/clone_${args.owner}_${args.repo}.log`;
      
      // Create directory and start background clone
      await ctx.runAction(internal.flyApi.execCommand, {
        machineId,
        command: ["mkdir", "-p", `/repos/${args.owner}`]
      });

      // Check if repo already exists (from previous clone)
      try {
        const checkResult = await ctx.runAction(internal.flyApi.execCommand, {
          machineId,
          command: ["test", "-d", repoPath]
        });
        // If no error, directory exists - remove it first
        await ctx.runAction(internal.flyApi.execCommand, {
          machineId,
          command: ["rm", "-rf", repoPath]
        });
      } catch (e) {
        // Directory doesn't exist, which is expected
      }

      // Start git clone in background with nohup
      await ctx.runAction(internal.flyApi.execCommand, {
        machineId,
        command: ["nohup", "sh", "-c", `git clone ${args.repoUrl} ${repoPath} > ${logFile} 2>&1 && echo "CLONE_SUCCESS" >> ${logFile} || echo "CLONE_ERROR" >> ${logFile} &`]
      });

      // Schedule polling to check for completion
      await ctx.scheduler.runAfter(5000, internal.files.checkCloneProgress, {
        fileId: args.fileId,
        machineId,
        repoPath,
        logFile,
        owner: args.owner,
        repo: args.repo,
        attempt: 1
      });

      console.log(`Background git clone started for: ${args.repoUrl} -> ${repoPath}`);
    } catch (error) {
      console.error("Failed to start repository clone:", error);
      
      // Update file status to error
      await ctx.runMutation(internal.files.updateFileMetadata, {
        fileId: args.fileId,
        metadata: {
          gitRepoUrl: args.repoUrl,
          owner: args.owner,
          repo: args.repo,
          cloneStatus: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          errorAt: Date.now(),
        },
      });
      
      throw error;
    }
  },
});

// Check clone progress (scheduled function)
export const checkCloneProgress = internalAction({
  args: {
    fileId: v.id("files"),
    machineId: v.string(),
    repoPath: v.string(),
    logFile: v.string(),
    owner: v.string(),
    repo: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    
    try {
      // Check if clone process completed by reading the log file
      const result = await ctx.runAction(internal.flyApi.execCommand, {
        machineId: args.machineId,
        command: ["tail", "-1", args.logFile]
      });
      
      const lastLine = result.stdout?.trim() || "";
      
      if (lastLine.includes("CLONE_SUCCESS")) {
        // Clone completed successfully
        await ctx.runMutation(internal.files.updateFileMetadata, {
          fileId: args.fileId,
          metadata: {
            cloneStatus: "completed",
            repoPath: args.repoPath,
            machineId: args.machineId,
            clonedAt: Date.now(),
          },
        });
        
        console.log(`Repository clone completed: ${args.owner}/${args.repo}`);
        return;
      } else if (lastLine.includes("CLONE_ERROR")) {
        // Clone failed
        const logContent = await ctx.runAction(internal.flyApi.execCommand, {
          machineId: args.machineId,
          command: ["cat", args.logFile]
        });
        
        await ctx.runMutation(internal.files.updateFileMetadata, {
          fileId: args.fileId,
          metadata: {
            cloneStatus: "error",
            error: logContent.stdout || "Clone failed",
            errorAt: Date.now(),
          },
        });
        
        console.log(`Repository clone failed: ${args.owner}/${args.repo}`);
        return;
      } else if (args.attempt >= maxAttempts) {
        // Timeout
        await ctx.runMutation(internal.files.updateFileMetadata, {
          fileId: args.fileId,
          metadata: {
            cloneStatus: "error",
            error: "Clone operation timed out after 10 minutes",
            errorAt: Date.now(),
          },
        });
        
        console.log(`Repository clone timed out: ${args.owner}/${args.repo}`);
        return;
      }
      
      // Still in progress, schedule next check (every 5 seconds)
      await ctx.scheduler.runAfter(5000, internal.files.checkCloneProgress, {
        ...args,
        attempt: args.attempt + 1,
      });
      
    } catch (error) {
      console.error("Error checking clone progress:", error);
      
      if (args.attempt >= maxAttempts) {
        await ctx.runMutation(internal.files.updateFileMetadata, {
          fileId: args.fileId,
          metadata: {
            cloneStatus: "error",
            error: error instanceof Error ? error.message : "Unknown error checking progress",
            errorAt: Date.now(),
          },
        });
      } else {
        // Retry in 5 seconds
        await ctx.scheduler.runAfter(5000, internal.files.checkCloneProgress, {
          ...args,
          attempt: args.attempt + 1,
        });
      }
    }
  },
});

// Create a new file
export const create = mutation({
  args: {
    name: v.string(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the user to find their organization and team
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the user's team (assuming one team per organization for now)
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .first();
    
    if (!team) {
      throw new Error("Team not found for user's organization");
    }

    // Check if a file with this name already exists in the user's team
    const existingFile = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", user.organizationId)
         .eq("teamId", team._id)
         .eq("name", args.name)
      )
      .first();

    if (existingFile) {
      throw new Error(`A file named "${args.name}" already exists. Please choose a different name.`);
    }

    const now = Date.now();

    const fileId = await ctx.db.insert("files", {
      organizationId: user.organizationId,
      teamId: team._id,
      name: args.name,
      lastMessageAt: now,
      createdAt: now,
      isStreaming: false,
      visibility: args.visibility ?? "private", // Default to private
      metadata: args.metadata,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createFileEvent, {
      userId,
      eventType: "create_file",
      fileId,
      fileName: args.name,
    });

    return fileId;
  },
});

// Internal create file (for HTTP actions that already have authenticated user)
export const internalCreate = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get the user to find their organization and team
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Find the user's team (assuming one team per organization for now)
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .first();
    
    if (!team) {
      throw new Error("Team not found for user's organization");
    }

    // Check if a file with this name already exists in the user's team
    const existingFile = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", user.organizationId)
         .eq("teamId", team._id)
         .eq("name", args.name)
      )
      .first();

    if (existingFile) {
      // For Claude Code imports, check if the existing file is also a Claude Code file
      // If so, and it has the same session ID, return it
      // Otherwise, create a unique name
      if (args.metadata?.claudeCodeSessionId && 
          existingFile.metadata?.claudeCodeSessionId === args.metadata.claudeCodeSessionId) {
        console.log(`Returning existing Claude Code file ${existingFile._id} for session ${args.metadata.claudeCodeSessionId}`);
        return existingFile._id;
      }
      
      // If it's a different Claude Code session or not a Claude Code file, make the name unique
      if (args.metadata?.claudeCodeSessionId) {
        // Insert session ID before the .chat extension to keep proper format
        const sessionIdSuffix = args.metadata.claudeCodeSessionId.substring(0, 8);
        let uniqueName: string;
        
        if (args.name.endsWith('.chat')) {
          // Remove .chat, add session ID, then add .chat back
          const baseName = args.name.slice(0, -5); // Remove '.chat'
          uniqueName = `${baseName}_${sessionIdSuffix}.chat`;
        } else {
          // Fallback for names that don't end in .chat
          uniqueName = `${args.name}_${sessionIdSuffix}`;
        }
        
        console.log(`File name conflict for Claude Code session, using unique name: ${uniqueName}`);
        args.name = uniqueName;
        
        // Check if this unique name also exists
        const uniqueExisting = await ctx.db
          .query("files")
          .withIndex("unique_name_in_team", (q) => 
            q.eq("organizationId", user.organizationId)
             .eq("teamId", team._id)
             .eq("name", uniqueName)
          )
          .first();
          
        if (uniqueExisting) {
          console.log(`Returning existing file with unique name ${uniqueExisting._id}`);
          return uniqueExisting._id;
        }
      } else {
        // For non-Claude Code files, just return existing
        return existingFile._id;
      }
    }

    const now = Date.now();

    const fileId = await ctx.db.insert("files", {
      organizationId: user.organizationId,
      teamId: team._id,
      name: args.name,
      lastMessageAt: now,
      createdAt: now,
      isStreaming: false,
      visibility: args.visibility ?? "private", // Default to private
      metadata: args.metadata,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createFileEvent, {
      userId: args.userId,
      eventType: "create_file",
      fileId,
      fileName: args.name,
    });

    return fileId;
  },
});

// List all files for the user's team
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get the user to find their team
    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // Find the user's team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .first();
    
    if (!team) {
      return [];
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .order("desc")
      .collect();

    return files;
  },
});

// Internal query to get a file (for use in actions)
export const getFileInternal = internalQuery({
  args: {
    fileId: v.id("files"),
    userId: v.id("users"),
  },
  handler: async (ctx: any, args: any) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }

    // Get the user to check team membership
    const user = await ctx.db.get(args.userId);
    if (!user || file.teamId !== user.teamId) {
      return null;
    }

    return file;
  },
});

// Internal query to find file by Claude Code session ID
export const findByClaudeCodeSessionId = internalQuery({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the user to find their team
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Find the user's team
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .first();
    
    if (!team) {
      return null;
    }

    // Search for file with matching claudeCodeSessionId in the user's team
    const files = await ctx.db
      .query("files")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    // Find file with matching claudeCodeSessionId in metadata
    return files.find(file => 
      file.metadata?.claudeCodeSessionId === args.sessionId
    ) || null;
  },
});

// Get a specific file
export const get = query({
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
      return null;
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    return file;
  },
});

// Get a file by filename within the user's team
export const getByName = query({
  args: {
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get the user to find their team
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Find the file by name within the user's team
    const file = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", user.organizationId)
         .eq("teamId", user.teamId)
         .eq("name", args.fileName)
      )
      .first();

    return file;
  },
});

// Get a file by org/team/filename for URL-based access (supports public files)
export const getByOrgTeamAndName = query({
  args: {
    organizationId: v.id("organizations"),
    teamId: v.id("teams"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // Find the file by name within the specified org/team
    const file = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("teamId", args.teamId)
         .eq("name", args.fileName)
      )
      .first();

    if (!file) {
      return null;
    }

    if (userId) {
      // Authenticated user: verify access to this org/team
      const user = await ctx.db.get(userId);
      if (!user) {
        return null;
      }

      // Verify user has access to this org/team
      if (user.organizationId !== args.organizationId || user.teamId !== args.teamId) {
        return null;
      }

      return file;
    } else {
      // Unauthenticated user: only return public files
      if (file.visibility === "public") {
        return file;
      }
      return null;
    }
  },
});

// Update file name
export const updateName = mutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    // Skip duplicate check if the name hasn't changed
    if (file.name !== args.name) {
      // Check if another file with this name already exists in the user's team
      const existingFile = await ctx.db
        .query("files")
        .withIndex("unique_name_in_team", (q) => 
          q.eq("organizationId", user.organizationId)
           .eq("teamId", user.teamId)
           .eq("name", args.name)
        )
        .first();

      if (existingFile) {
        throw new Error(`A file named "${args.name}" already exists. Please choose a different name.`);
      }
    }

    await ctx.db.patch(args.fileId, {
      name: args.name,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createFileEvent, {
      userId,
      eventType: "rename_file",
      fileId: args.fileId,
      fileName: args.name,
    });
  },
});

// Update file visibility
export const updateVisibility = mutation({
  args: {
    fileId: v.id("files"),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    await ctx.db.patch(args.fileId, {
      visibility: args.visibility,
    });
  },
});

// General update function for files
export const update = mutation({
  args: {
    fileId: v.id("files"),
    name: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    isStreaming: v.optional(v.boolean()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.lastMessageAt !== undefined) updateData.lastMessageAt = args.lastMessageAt;
    if (args.isStreaming !== undefined) updateData.isStreaming = args.isStreaming;
    if (args.visibility !== undefined) updateData.visibility = args.visibility;
    if (args.metadata !== undefined) updateData.metadata = args.metadata;

    await ctx.db.patch(args.fileId, updateData);
  },
});

// Delete a file
export const remove = mutation({
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
      throw new Error("File not found");
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    // Check if this is a Git repository
    const metadata = file.metadata as any;
    const isGitRepo = file.name.endsWith('.git') && metadata?.gitRepoUrl;

    if (isGitRepo) {
      // Schedule cleanup of the repository on Fly.io machine
      await ctx.scheduler.runAfter(0, internal.files.cleanupGitRepository, {
        fileId: args.fileId,
        userId,
        owner: metadata.owner,
        repo: metadata.repo,
      });
    } else {
      // Check if this is a blog file
      const isBlogFile = file.name.endsWith('.blog');
      
      if (isBlogFile) {
        // Delete all blog content in batches
        let blogsCursor = null;
        let hasMore = true;
        
        while (hasMore) {
          const blogsQuery = ctx.db
            .query("blogs")
            .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
            .paginate({ cursor: blogsCursor, numItems: 100 });
          
          const blogsPage = await blogsQuery;
          
          for (const blog of blogsPage.page) {
            await ctx.db.delete(blog._id);
          }
          
          hasMore = blogsPage.isDone === false;
          blogsCursor = blogsPage.continueCursor;
        }
      }
      
      // Note: We don't delete messages to avoid memory limit issues with large chat files
      // Orphan messages will remain but won't cause problems
    }

    // Record timeline event before deletion
    await ctx.runMutation(internal.timeline.createFileEvent, {
      userId,
      eventType: "delete_file",
      fileName: file.name,
    });

    // Delete the file
    await ctx.db.delete(args.fileId);
  },
});

// Internal action to cleanup Git repository from Fly.io machine
export const cleanupGitRepository = internalAction({
  args: {
    fileId: v.id("files"),
    userId: v.id("users"),
    owner: v.string(),
    repo: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the user's machine
      const machines = await ctx.runQuery(internal.flyMachines.getUserMachines, {
        userId: args.userId,
      });
      
      const runningMachine = machines.find((m: any) => m.status === "running");

      if (runningMachine) {
        // Remove the repository directory from the machine
        const repoPath = `/repos/${args.owner}/${args.repo}`;
        
        try {
          await ctx.runAction(internal.flyApi.execCommand, {
            machineId: runningMachine.machineId,
            command: ["rm", "-rf", repoPath]
          });
        } catch (error) {
          console.error(`Failed to cleanup repository ${repoPath}:`, error);
          // Don't throw here - we still want to delete the file record
        }
      }
    } catch (error) {
      console.error("Failed to cleanup Git repository:", error);
      // Don't throw - the file record should still be deleted
    }
  },
});

// List public files (no authentication required)
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .order("desc")
      .collect();

    return files;
  },
});

// Get a public file by org/team/filename (no authentication required)
export const getPublicByOrgTeamAndName = query({
  args: {
    organizationId: v.id("organizations"),
    teamId: v.id("teams"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the file by name within the specified org/team
    const file = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("teamId", args.teamId)
         .eq("name", args.fileName)
      )
      .first();

    // Only return if the file is public
    if (file && file.visibility === "public") {
      return file;
    }

    return null;
  },
});

// Get file by name for any visibility (supports both authenticated and unauthenticated users)
export const getByNameOrPublic = query({
  args: {
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    if (userId) {
      // Authenticated user: use existing getByName logic
      const user = await ctx.db.get(userId);
      if (!user) {
        return null;
      }

      const file = await ctx.db
        .query("files")
        .withIndex("unique_name_in_team", (q) => 
          q.eq("organizationId", user.organizationId)
           .eq("teamId", user.teamId)
           .eq("name", args.fileName)
        )
        .first();

      return file;
    } else {
      // Unauthenticated user: find public file across all teams
      const files = await ctx.db
        .query("files")
        .filter((q) => 
          q.and(
            q.eq(q.field("name"), args.fileName),
            q.eq(q.field("visibility"), "public")
          )
        )
        .first();

      return files;
    }
  },
});

// Helper: Get organization by ID (public access)
export const getOrganizationById = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organizationId);
  },
});

// Helper: Get team by ID (public access)
export const getTeamById = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

// Helper: Get file with org/team data for URL construction
export const getFileWithOrgTeamData = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const file = await ctx.db.get(args.fileId);
    
    if (!file) {
      return null;
    }

    // For authenticated users, check team membership
    if (userId) {
      const user = await ctx.db.get(userId);
      if (!user || file.teamId !== user.teamId) {
        return null;
      }
    } else {
      // For unauthenticated users, only return public files
      if (file.visibility !== "public") {
        return null;
      }
    }

    // Get org and team data
    const organization = await ctx.db.get(file.organizationId);
    const team = await ctx.db.get(file.teamId);

    if (!organization || !team) {
      return null;
    }

    return {
      file,
      organization,
      team,
    };
  },
});

// Regenerate chat title using AI
export const regenerateTitle = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the file
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Get the user to check team membership
    const user = await ctx.db.get(userId);
    if (!user || file.teamId !== user.teamId) {
      throw new Error("File not found or access denied");
    }

    // Only allow regenerating titles for .chat files
    if (!file.name.endsWith('.chat')) {
      throw new Error("Title regeneration is only supported for chat files");
    }

    // Set regeneration flag
    await ctx.db.patch(args.fileId, {
      isRegeneratingTitle: true,
    });

    // Get the first 5 and last 10 messages
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("asc")
      .collect();

    if (allMessages.length === 0) {
      throw new Error("No messages found in this chat");
    }

    // Extract first 5 and last 10 messages
    const firstMessages = allMessages.slice(0, 5);
    const lastMessages = allMessages.slice(-10);
    
    // Combine messages (avoiding duplicates if chat has less than 15 messages)
    const messagesToAnalyze = allMessages.length <= 15 
      ? allMessages 
      : [...firstMessages, ...lastMessages];

    // Convert messages to a format suitable for the AI
    const messageContent = messagesToAnalyze.map(msg => {
      const textContent = msg.content
        .filter(part => part.type === 'text')
        .map(part => (part as { type: 'text'; text: string }).text)
        .join(' ');
      
      return `${msg.role}: ${textContent}`;
    }).join('\n\n');

    // Schedule the title generation action
    await ctx.scheduler.runAfter(0, internal.files.generateTitleAction, {
      fileId: args.fileId,
      messageContent,
      currentTitle: file.name,
      userId,
    });

    return { success: true, message: "Title regeneration started" };
  },
});

// Internal action to generate title using AI SDK
export const generateTitleAction = internalAction({
  args: {
    fileId: v.id("files"),
    messageContent: v.string(),
    currentTitle: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Initialize OpenRouter provider
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // Define the schema for structured output
      const titleSchema = z.object({
        title: z.string().describe("A concise, descriptive title for the chat conversation (max 50 characters). Use underscores instead of spaces (e.g., 'fix_authentication_bug' instead of 'fix authentication bug')"),
        reasoning: z.string().describe("Brief explanation of why this title was chosen"),
      });

      // Generate title using structured output
      const result = await generateObject({
        model: openrouter('openai/gpt-4o'),
        schema: titleSchema,
        prompt: `
Analyze the following chat conversation and generate a concise, descriptive title for it.

Current title: ${args.currentTitle}

Chat conversation:
${args.messageContent}

Guidelines:
- Title should be 50 characters or less
- Use underscores (_) instead of spaces between words
- Should capture the main topic or purpose of the conversation
- Should be descriptive but concise
- Avoid generic titles like "Chat" or "Conversation"
- Focus on what the conversation is actually about
- If it's a technical discussion, include relevant technology/topic names
- If it's a specific task or project, mention that
- Keep it professional and clear
- Examples: "fix_auth_bug", "implement_search_feature", "debug_api_endpoint"

Please provide a title that would help someone quickly understand what this conversation is about.
        `,
        temperature: 0.7,
      });

      // Update the file name
      await ctx.runMutation(internal.files.updateFileMetadata, {
        fileId: args.fileId,
        metadata: {
          ...((await ctx.runQuery(internal.files.getFileInternal, { fileId: args.fileId, userId: args.userId }))?.metadata || {}),
          lastTitleRegeneration: Date.now(),
        },
      });

      // Preserve folder structure when updating the file name
      let newFileName = result.object.title;
      
      // Check if the current title has a folder path (e.g., "claude/session-123.chat")
      const lastSlashIndex = args.currentTitle.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        // Extract the folder path and append the new title
        const folderPath = args.currentTitle.substring(0, lastSlashIndex + 1);
        newFileName = folderPath + result.object.title;
      }
      
      // Ensure .chat extension is preserved
      if (args.currentTitle.endsWith('.chat') && !newFileName.endsWith('.chat')) {
        newFileName += '.chat';
      }

      // Update the file name
      await ctx.runMutation(internal.files.updateFilename, {
        fileId: args.fileId,
        name: newFileName,
      });

      // Record timeline event
      await ctx.runMutation(internal.timeline.createFileEvent, {
        userId: args.userId,
        eventType: "rename_file",
        fileId: args.fileId,
        fileName: newFileName,
      });

      console.log(`Title regenerated successfully: ${newFileName}`);
    } catch (error) {
      console.error("Error generating title:", error);
      // Don't throw - we want the mutation to succeed even if title generation fails
    } finally {
      // Always clear the regeneration flag
      await ctx.runMutation(internal.files.clearRegenerationFlag, {
        fileId: args.fileId,
      });
    }
  },
});

// Internal mutation to update filename
export const updateFilename = internalMutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      name: args.name,
    });
  },
});

// Internal mutation to clear regeneration flag
export const clearRegenerationFlag = internalMutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      isRegeneratingTitle: false,
    });
  },
});

