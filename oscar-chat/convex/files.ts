import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

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
      // For internal creation (Claude Code import), just return existing file
      return existingFile._id;
    }

    const now = Date.now();

    const fileId = await ctx.db.insert("files", {
      organizationId: user.organizationId,
      teamId: team._id,
      name: args.name,
      lastMessageAt: now,
      createdAt: now,
      isStreaming: false,
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

// Get a file by org/team/filename for URL-based access
export const getByOrgTeamAndName = query({
  args: {
    organizationId: v.id("organizations"),
    teamId: v.id("teams"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get the user to verify access
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Verify user has access to this org/team
    if (user.organizationId !== args.organizationId || user.teamId !== args.teamId) {
      return null;
    }

    // Find the file by name within the specified org/team
    const file = await ctx.db
      .query("files")
      .withIndex("unique_name_in_team", (q) => 
        q.eq("organizationId", args.organizationId)
         .eq("teamId", args.teamId)
         .eq("name", args.fileName)
      )
      .first();

    return file;
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

// General update function for files
export const update = mutation({
  args: {
    fileId: v.id("files"),
    name: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    isStreaming: v.optional(v.boolean()),
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