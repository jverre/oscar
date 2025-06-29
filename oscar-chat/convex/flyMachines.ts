import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";

// Internal query to get user machines (for use in actions)
export const getUserMachines = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Find all machines for the user
    const machines = await ctx.db
      .query("flyMachines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return machines;
  },
});

// Create a new Fly.io machine record (to be called after actual machine creation)
export const createMachineRecord = internalMutation({
  args: {
    machineId: v.string(),
    appName: v.string(),
    region: v.string(),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("error")
    ),
    userId: v.id("users"),
    volumeId: v.optional(v.string()),
    volumeName: v.optional(v.string()),
    mountPath: v.optional(v.string()),
    autoStop: v.optional(v.boolean()),
    autoStart: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the user to find their organization and team
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Check if user already has an active machine
    const existingMachine = await ctx.db
      .query("flyMachines")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "running"),
          q.eq(q.field("status"), "creating")
        )
      )
      .first();

    if (existingMachine) {
      throw new Error("User already has an active machine");
    }

    const machineRecordId = await ctx.db.insert("flyMachines", {
      userId: args.userId,
      organizationId: user.organizationId,
      teamId: user.teamId,
      machineId: args.machineId,
      appName: args.appName,
      status: args.status,
      region: args.region,
      volumeId: args.volumeId,
      volumeName: args.volumeName,
      mountPath: args.mountPath,
      autoStop: args.autoStop,
      autoStart: args.autoStart,
      createdAt: now,
      lastUsedAt: now,
    });

    return machineRecordId;
  },
});

// Internal mutation to update machine status (for use in actions)
export const updateMachineStatusInternal = internalMutation({
  args: {
    machineId: v.string(),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("error")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find the machine record
    const machine = await ctx.db
      .query("flyMachines")
      .withIndex("by_machine_id", (q) => q.eq("machineId", args.machineId))
      .first();

    if (!machine) {
      throw new Error("Machine not found");
    }

    // Update the machine status
    const updateData: any = {
      status: args.status,
      lastUsedAt: Date.now(),
    };

    if (args.metadata !== undefined) {
      updateData.metadata = args.metadata;
    }

    await ctx.db.patch(machine._id, updateData);
  },
});

// Internal mutation to touch machine (for use in actions)
export const touchMachineInternal = internalMutation({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the machine record
    const machine = await ctx.db
      .query("flyMachines")
      .withIndex("by_machine_id", (q) => q.eq("machineId", args.machineId))
      .first();

    if (!machine) {
      throw new Error("Machine not found");
    }

    // Update lastUsedAt
    await ctx.db.patch(machine._id, {
      lastUsedAt: Date.now(),
    });
  },
});
