import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { requireOrgMember, getAuthenticatedUser } from "./authUtils";
import { internal } from "./_generated/api";

// Sanitize file path by removing leading slashes and normalizing
function sanitizePath(path: string): string {
  return path.replace(/^\/+/, "").trim();
}

// Helper function to find the next available filename with numbering
async function getNextAvailableFilename(
  ctx: any,
  organizationId: string,
  originalPath: string,
  excludeFileId?: string
): Promise<string> {
  let counter = 1;
  let testPath = originalPath;

  // Check if the original path is available (excluding current file if provided)
  const existingFile = await ctx.db
    .query("files")
    .withIndex("by_org_path")
    .filter((q: any) => q.eq(q.field("organizationId"), organizationId) && q.eq(q.field("path"), testPath))
    .unique();

  if (!existingFile || (excludeFileId && existingFile._id === excludeFileId)) {
    return testPath;
  }

  // If original path is taken, try with numbers
  const pathParts = originalPath.split('.');
  const hasExtension = pathParts.length > 1 && !originalPath.endsWith('/');
  const baseName = hasExtension ? pathParts.slice(0, -1).join('.') : originalPath;
  const extension = hasExtension ? pathParts[pathParts.length - 1] : '';

  while (true) {
    if (hasExtension) {
      testPath = `${baseName} (${counter}).${extension}`;
    } else {
      testPath = `${baseName} (${counter})`;
    }

    const existingFile = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q: any) => q.eq(q.field("organizationId"), organizationId) && q.eq(q.field("path"), testPath))
      .unique();

    if (!existingFile || (excludeFileId && existingFile._id === excludeFileId)) {
      return testPath;
    }

    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error("Too many files with similar names");
    }
  }
}


export const getFiles = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated
    const user = await getAuthenticatedUser(ctx);
    
    if (user && user.organizationId === args.organizationId) {
      // User is authenticated and has access - return all files
      const allFiles = await ctx.db
        .query("files")
        .withIndex("by_org_path")
        .filter((q) => 
          q.and(
            q.eq(q.field("organizationId"), args.organizationId),
            q.neq(q.field("isHidden"), true)
          )
        )
        .collect();

      // Group files by public/private status
      const publicFiles = allFiles.filter(f => f.isPublic === true);
      const privateFiles = allFiles.filter(f => f.isPublic === false);

      return {
        publicFiles,
        privateFiles
      };
    } else {
      // User is not authenticated or doesn't have access - return only public files
      const publicFiles = await ctx.db
        .query("files")
        .withIndex("by_org_path")
        .filter((q) => 
          q.and(
            q.eq(q.field("organizationId"), args.organizationId),
            q.eq(q.field("isPublic"), true),
            q.neq(q.field("isHidden"), true)
          )
        )
        .collect();

      return {
        publicFiles,
        privateFiles: []
      };
    }
  },
});

export const createFile = mutation({
  args: {
    organizationId: v.id("organizations"),
    path: v.string(),
    content: v.optional(v.string()),
    type: v.union(v.literal("user"),v.literal("plugin")),
    isPublic: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization and get user info
    const userWithOrg = await requireOrgMember(ctx, args.organizationId);
    
    // Sanitize the file path
    const sanitizedPath = sanitizePath(args.path);
    
    if (!sanitizedPath) {
      throw new Error("Invalid file path");
    }

    // Get the next available filename (with auto-numbering if needed)
    const availablePath = await getNextAvailableFilename(ctx, args.organizationId, sanitizedPath);

    // Create the file - default to private (isPublic: false)
    const fileId = await ctx.db.insert("files", {
      organizationId: args.organizationId,
      path: availablePath,
      content: args.content || "",
      type: args.type,
      isPublic: args.isPublic ?? false, // Default to private
      isHidden: args.isHidden ?? false, // Default to visible
      createdBy: userWithOrg._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return fileId;
  },
});

export const createFolder = mutation({
  args: {
    organizationId: v.id("organizations"),
    path: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization and get user info
    const userWithOrg = await requireOrgMember(ctx, args.organizationId);
    
    // Sanitize the folder path
    const sanitizedPath = sanitizePath(args.path);
    
    if (!sanitizedPath) {
      throw new Error("Invalid folder path");
    }

    // Get the next available folder name (with auto-numbering if needed)
    const availablePath = await getNextAvailableFilename(ctx, args.organizationId, sanitizedPath);

    // Create the folder as a file entry with directory type
    const folderId = await ctx.db.insert("files", {
      organizationId: args.organizationId,
      path: availablePath,
      content: "",
      type: "folder",
      isPublic: args.isPublic ?? false, // Default to private
      createdBy: userWithOrg._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

export const deleteFile = mutation({
  args: {
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);

    // Get the file to delete
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Verify the file belongs to the organization
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }

    // Delete the file
    await ctx.db.delete(args.fileId);

    return { success: true };
  },
});

export const renameFile = mutation({
  args: {
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
    newPath: v.string(),
  },
  handler: async (ctx, args) => {
    // Sanitize the new path
    const sanitizedPath = sanitizePath(args.newPath);
    
    if (!sanitizedPath) {
      throw new Error("Invalid file path");
    }

    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);

    // Get the file to rename
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Verify the file belongs to the organization
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }

    // Check if a file with the new path already exists (excluding the current file)
    const availablePath = await getNextAvailableFilename(ctx, args.organizationId, sanitizedPath, args.fileId);

    // Update the file path
    await ctx.db.patch(args.fileId, {
      path: availablePath,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const deleteFolder = mutation({
  args: {
    organizationId: v.id("organizations"),
    folderPath: v.string(),
  },
  handler: async (ctx, args) => {
    // Sanitize the folder path
    const sanitizedPath = sanitizePath(args.folderPath);
    
    if (!sanitizedPath) {
      throw new Error("Invalid folder path");
    }

    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);

    // Get all files that start with the folder path
    const filesToDelete = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Filter files that are within this folder path
    const filteredFiles = filesToDelete.filter(file => 
      file.path.startsWith(sanitizedPath + "/") || file.path === sanitizedPath
    );

    // Delete all files within the folder
    for (const file of filteredFiles) {
      await ctx.db.delete(file._id);
    }

    return { success: true, deletedCount: filteredFiles.length };
  },
});

export const toggleFileVisibility = mutation({
  args: {
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);

    // Get the file to toggle
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Verify the file belongs to the organization
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }

    // Toggle the isPublic field
    await ctx.db.patch(args.fileId, {
      isPublic: !file.isPublic,
      updatedAt: Date.now(),
    });

    return { success: true, isPublic: !file.isPublic };
  },
});

// Create hidden plugin demo file
export const createPluginDemoFile = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    pluginId: v.union(v.id("plugins"), v.string()),
  },
  handler: async (ctx, args) => {
    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create the hidden plugin demo file
    const fileId = await ctx.db.insert("files", {
      organizationId: args.organizationId,
      path: `${args.pluginId}`,
      content: "", // Empty content initially
      type: "plugin",
      isPublic: false, // Private by default
      isHidden: true, // Mark as hidden
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return fileId;
  },
});

// Get plugin demo file
export const getFileByPath = query({
  args: {
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db
      .query("files")
      .filter((q) => 
        q.eq(q.field("path"), `${args.path}`)
      )
      .unique();

    return file;
  },
});

export const getFileById = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    return file;
  },
});

// Internal query for authenticated users - returns all files
export const getPrivateFiles = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    parentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all files for the organization, excluding hidden files
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.neq(q.field("isHidden"), true)
        )
      )
      .collect();

    if (!args.parentPath) {
      // Return root level files and directories
      const rootItems = allFiles.filter((file) => {
        const segments = file.path.split("/").filter(Boolean);
        return segments.length === 1;
      });

      // Also get unique directories at root level
      const rootDirs = new Set<string>();
      allFiles.forEach((file) => {
        const segments = file.path.split("/").filter(Boolean);
        if (segments.length > 1) {
          rootDirs.add(segments[0]);
        }
      });

      return [
        ...rootItems,
        ...Array.from(rootDirs).map((dir) => ({
          _id: `dir-${dir}` as any,
          path: dir,
          type: "directory",
          isDirectory: true,
          organizationId: args.organizationId,
        })),
      ];
    }

    // Return items within the specified parent path
    const parentSegments = args.parentPath.split("/").filter(Boolean);
    const items = allFiles.filter((file) => {
      const segments = file.path.split("/").filter(Boolean);
      
      // Check if file is direct child of parent path
      if (segments.length !== parentSegments.length + 1) {
        return false;
      }
      
      // Check if all parent segments match
      return parentSegments.every((seg, i) => segments[i] === seg);
    });

    // Get subdirectories within the parent path
    const subDirs = new Set<string>();
    allFiles.forEach((file) => {
      const segments = file.path.split("/").filter(Boolean);
      
      // Check if file is within parent path and has subdirectories
      if (segments.length > parentSegments.length + 1) {
        const matchesParent = parentSegments.every((seg, i) => segments[i] === seg);
        if (matchesParent) {
          subDirs.add(segments[parentSegments.length]);
        }
      }
    });

    return [
      ...items,
      ...Array.from(subDirs).map((dir) => ({
        _id: `dir-${args.parentPath}/${dir}` as any,
        path: `${args.parentPath}/${dir}`,
        type: "directory",
        isDirectory: true,
        organizationId: args.organizationId,
      })),
    ];
  },
});

// Internal query for unauthenticated users - returns only public files
export const getPublicFiles = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    parentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get only public files for the organization, excluding hidden files
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q) => 
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("isPublic"), true),
          q.neq(q.field("isHidden"), true)
        )
      )
      .collect();

    if (!args.parentPath) {
      // Return root level files and directories
      const rootItems = allFiles.filter((file) => {
        const segments = file.path.split("/").filter(Boolean);
        return segments.length === 1;
      });

      // Also get unique directories at root level
      const rootDirs = new Set<string>();
      allFiles.forEach((file) => {
        const segments = file.path.split("/").filter(Boolean);
        if (segments.length > 1) {
          rootDirs.add(segments[0]);
        }
      });

      return [
        ...rootItems,
        ...Array.from(rootDirs).map((dir) => ({
          _id: `dir-${dir}` as any,
          path: dir,
          type: "directory",
          isDirectory: true,
          organizationId: args.organizationId,
        })),
      ];
    }

    // Return items within the specified parent path
    const parentSegments = args.parentPath.split("/").filter(Boolean);
    const items = allFiles.filter((file) => {
      const segments = file.path.split("/").filter(Boolean);
      
      // Check if file is direct child of parent path
      if (segments.length !== parentSegments.length + 1) {
        return false;
      }
      
      // Check if all parent segments match
      return parentSegments.every((seg, i) => segments[i] === seg);
    });

    // Get subdirectories within the parent path
    const subDirs = new Set<string>();
    allFiles.forEach((file) => {
      const segments = file.path.split("/").filter(Boolean);
      
      // Check if file is within parent path and has subdirectories
      if (segments.length > parentSegments.length + 1) {
        const matchesParent = parentSegments.every((seg, i) => segments[i] === seg);
        if (matchesParent) {
          subDirs.add(segments[parentSegments.length]);
        }
      }
    });

    return [
      ...items,
      ...Array.from(subDirs).map((dir) => ({
        _id: `dir-${args.parentPath}/${dir}` as any,
        path: `${args.parentPath}/${dir}`,
        type: "directory",
        isDirectory: true,
        organizationId: args.organizationId,
      })),
    ];
  },
});