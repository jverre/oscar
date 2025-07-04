"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Create a new Daytona sandbox
export const createSandbox = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Create new sandbox
    console.log("Creating new sandbox for user:", args.userId);

    const response = await fetch('https://app.daytona.io/api/sandbox', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAYTONA_API_KEY}`,
      },
      body: JSON.stringify({
        language: 'typescript',
        envVars: { NODE_ENV: 'development' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create sandbox: ${response.statusText}`);
    }

    const sandbox = await response.json();
    
    // Store in database
    await ctx.runMutation(internal.daytonaSandboxes.createSandboxRecord, {
      userId: args.userId,
      sandboxId: sandbox.id,
    });
    
    return {
      sandboxId: sandbox.id,
    };
  },
});
