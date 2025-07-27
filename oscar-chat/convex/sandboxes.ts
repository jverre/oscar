import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    console.log("[SANDBOX_CREATE] Raw modal response text:", responseText);

    await ctx.runMutation(internal.sandboxes.updateSandbox, {
      sandboxId: args.sandboxId,
      status: "active",
      modalSandboxId: responseText.sandbox_id,
      sandboxUrl: responseText.tunnel_info.tunnel_url,
    });
  }
});

export const getSandboxForFile = query({
  args: {
    fileId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    if (!args.fileId) {
      return null;
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
    });
  }
});

export const createSandboxForFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    console.log("Creating sandbox for fileId", args.fileId);
    // Initialize sandbox
    const sandboxId = await ctx.db.insert("sandboxes", {
      fileId: args.fileId,
      status: "creating",
    });

    // Get snapshotId
    const file = await ctx.runQuery(api.files.getFileById, {
      fileId: args.fileId,
    });
    console.log("file", file);

    let pluginId: Id<"plugins">;
    let plugin: any;

    if (file.type === "user") {
      plugin = await ctx.runQuery(api.plugins.getPluginByExtension, {
        extension: file.path.split(".").pop() as string,
      });

      if (!plugin) {
        throw new Error("Plugin not found");
      }
    } else if (file.type === "plugin") {
      plugin = await ctx.runQuery(api.plugins.getPluginById, {
        pluginId: file.path,
      });

      if (!plugin) {
        throw new Error("Plugin not found");
      }
    } else {
      throw new Error("File type not supported");
    }

    console.log("Creating sandbox for fileId", args.fileId);
    console.log("plugin", plugin);
    await ctx.scheduler.runAfter(0, internal.sandboxes.createSandboxViaModal, {
      sandboxId: sandboxId,
      snapshotId: plugin.snapshotId,
    });
  }
});