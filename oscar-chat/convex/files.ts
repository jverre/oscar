import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Sanitize file path by removing leading slashes and normalizing
function sanitizePath(path: string): string {
  return path.replace(/^\/+/, "").trim();
}

// Helper function to find the next available filename with numbering
async function getNextAvailableFilename(
  ctx: any,
  organizationId: string,
  originalPath: string
): Promise<string> {
  let counter = 1;
  let testPath = originalPath;

  // Check if the original path is available
  const existingFile = await ctx.db
    .query("files")
    .withIndex("by_org_path")
    .filter((q: any) => q.eq(q.field("organizationId"), organizationId) && q.eq(q.field("path"), testPath))
    .unique();

  if (!existingFile) {
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

    if (!existingFile) {
      return testPath;
    }

    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error("Too many files with similar names");
    }
  }
}

// Helper function to find the next available filename with numbering (excluding current file for rename)
async function getNextAvailableFilenameForRename(
  ctx: any,
  organizationId: string,
  originalPath: string,
  excludeFileId: string
): Promise<string> {
  let counter = 1;
  let testPath = originalPath;

  // Check if the original path is available (excluding current file)
  const existingFile = await ctx.db
    .query("files")
    .withIndex("by_org_path")
    .filter((q: any) => q.eq(q.field("organizationId"), organizationId) && q.eq(q.field("path"), testPath))
    .unique();

  if (!existingFile || existingFile._id === excludeFileId) {
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

    if (!existingFile || existingFile._id === excludeFileId) {
      return testPath;
    }

    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error("Too many files with similar names");
    }
  }
}

export const getAllFiles = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get ALL files for the organization
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Group files by public/private status
    const publicFiles = allFiles.filter(f => f.isPublic === true);
    const privateFiles = allFiles.filter(f => f.isPublic === false);

    return {
      publicFiles,
      privateFiles
    };
  },
});

export const getFiles = query({
  args: {
    organizationId: v.id("organizations"),
    parentPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all files for the organization
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_org_path")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
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

      console.log("Debug getFiles:", {
        totalFiles: allFiles.length,
        rootItems: rootItems.length,
        rootDirs: Array.from(rootDirs),
        allFilePaths: allFiles.map(f => f.path)
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

export const createFile = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    path: v.string(),
    content: v.optional(v.string()),
    type: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Sanitize the file path
    const sanitizedPath = sanitizePath(args.path);
    
    if (!sanitizedPath) {
      throw new Error("Invalid file path");
    }

    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the organization
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
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
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return fileId;
  },
});

export const createFolder = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    path: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Sanitize the folder path
    const sanitizedPath = sanitizePath(args.path);
    
    if (!sanitizedPath) {
      throw new Error("Invalid folder path");
    }

    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the organization
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }

    // Get the next available folder name (with auto-numbering if needed)
    const availablePath = await getNextAvailableFilename(ctx, args.organizationId, sanitizedPath);

    // Create the folder as a file entry with directory type
    const folderId = await ctx.db.insert("files", {
      organizationId: args.organizationId,
      path: availablePath,
      content: "",
      type: "directory",
      isPublic: args.isPublic ?? false, // Default to private
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return folderId;
  },
});

export const deleteFile = mutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the organization
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }

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
    userId: v.id("users"),
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

    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the organization
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }

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
    const availablePath = await getNextAvailableFilenameForRename(ctx, args.organizationId, sanitizedPath, args.fileId);

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
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    folderPath: v.string(),
  },
  handler: async (ctx, args) => {
    // Sanitize the folder path
    const sanitizedPath = sanitizePath(args.folderPath);
    
    if (!sanitizedPath) {
      throw new Error("Invalid folder path");
    }

    // Get user from database
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify user belongs to the organization
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }

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