import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMember } from "./authUtils";

export const createSandboxViaModal = internalAction({
  args: {
    sandboxId: v.id("sandboxes"),
    snapshotId: v.string(),
  },
  handler: async (ctx, args) => {
    const modalPayload = {
      snapshot_id: args.snapshotId,
    };

    const modalResponse = await fetch(
      "https://jverre--ttyd-sandbox-create-sandbox.modal.run",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
        },
        body: JSON.stringify(modalPayload),
      }
    );

    const responseText = await modalResponse.json();
    
    const sandboxUrl = responseText.tunnel_info.tunnel_url;

    // Wait a bit for sandbox to be ready
    for (let i = 0; i < 20; i++) {
      try {
        await fetch(sandboxUrl, { method: "HEAD" });
        break;
      } catch {
        if (i < 19) await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await ctx.runMutation(internal.sandboxes.updateSandbox, {
      sandboxId: args.sandboxId,
      status: "active",
      modalSandboxId: responseText.sandbox_id,
      sandboxUrl: sandboxUrl,
    });
  }
});

export const getSandboxByFileId = internalQuery({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db
      .query("sandboxes")
      .filter((q) => 
        q.eq(q.field("fileId"), args.fileId)
      )
      .first();

    return sandbox;
  }
});

export const getSandboxForFile = query({
  args: {
    fileId: v.optional(v.id("files")),
    organizationId: v.id("organizations"),
    isPublicAccess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.fileId) {
      return null;
    }
    
    // Verify the file exists
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    if (args.isPublicAccess) {
      // For public access, verify the file is public
      if (!file.isPublic) {
        throw new Error("File is not public");
      }
    } else {
      // For private access, require user to be a member of the organization
      await requireOrgMember(ctx, args.organizationId);
    }

    const sandbox = await ctx.db
      .query("sandboxes")
      .filter((q) => 
        q.eq(q.field("fileId"), args.fileId)
      )
      .first();

    return sandbox;
  }
});

        
export const updateSandbox = internalMutation({
  args: {
    sandboxId: v.id("sandboxes"),
    status: v.union(
      v.literal("creating"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("error")
    ),
    modalSandboxId: v.string(),
    sandboxUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sandboxId, {
      status: args.status,
      modalSandboxId: args.modalSandboxId,
      sandboxUrl: args.sandboxUrl,
      expiresAt: Date.now() + 60 * 60 * 1000, // 60 minutes from now
    });
  }
});

export const deleteSandbox = internalMutation({
  args: {
    sandboxId: v.id("sandboxes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sandboxId);
  }
});

export const refreshSandbox = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    isPublicAccess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // For private access, require user to be a member of the organization
    if (!args.isPublicAccess) {
      await requireOrgMember(ctx, args.organizationId);
    }
    
    // Delete existing sandbox if it exists
    const existingSandbox = await ctx.db
      .query("sandboxes")
      .filter((q) => 
        q.eq(q.field("fileId"), args.fileId)
      )
      .first();
    
    if (existingSandbox) {
      await ctx.db.delete(existingSandbox._id);
    }
    
    // Create new sandbox - reuse the logic from createSandboxForFile
    await ctx.runMutation(api.sandboxes.createSandboxForFile, {
      fileId: args.fileId,
      organizationId: args.organizationId,
      isPublicAccess: args.isPublicAccess,
    });
  }
});

export const createSandboxForFile = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    isPublicAccess: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // For private access, require user to be a member of the organization
    if (!args.isPublicAccess) {
      await requireOrgMember(ctx, args.organizationId);
    }
    
    // Verify the file belongs to the organization
    const fileCheck = await ctx.db.get(args.fileId);
    if (!fileCheck) {
      throw new Error("File not found");
    }
    if (fileCheck.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    if (args.isPublicAccess && !fileCheck.isPublic) {
      throw new Error("File is not public");
    }
    
    // Initialize sandbox
    const sandboxId = await ctx.db.insert("sandboxes", {
      fileId: args.fileId,
      status: "creating",
    });

    // Get snapshotId
    const file = await ctx.runQuery(api.files.getFileById, {
      fileId: args.fileId,
    });
    
    let plugin: any;

    if (file.type === "user") {
      const extension = `.${file.path.split(".").pop()}` as string;
      
      plugin = await ctx.runQuery(internal.plugins.getPluginByExtension, {
        extension: extension,
        organizationId: args.organizationId,
      });

      if (!plugin) {
        throw new Error(`Plugin not found for extension: ${extension}`);
      }
    } else if (file.type === "plugin") {
      plugin = await ctx.runQuery(internal.plugins.getPluginById, {
        pluginId: file.path as Id<"organizationMarketplacePlugins"> | Id<"plugins">,
      });

      if (!plugin) {
        throw new Error(`Plugin not found for ID: ${file.path}`);
      }
    } else {
      throw new Error("File type not supported");
    }

    await ctx.scheduler.runAfter(0, internal.sandboxes.createSandboxViaModal, {
      sandboxId: sandboxId,
      snapshotId: plugin.snapshotId,
    });
  }
});

