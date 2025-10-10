import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { SandboxStatus } from "./schema";
import {
    updateSandboxToFailed,
    createDaytonaSandbox,
    startDaytonaSandbox,
    pollSandboxStarted,
    createProcessSession,
    executeServerStart,
    getPreviewUrl,
    pollHealthEndpoint,
} from "./lib/sandboxUtils";

export const createSandbox = action({
    args: {
        featureBranchId: v.id("featureBranches"),
    },
    handler: async (ctx, args) => {
        await ctx.runMutation(internal.featureBranches.updateSandbox, {
            featureBranchId: args.featureBranchId,
            sandboxId: "",
            sandboxStatus: SandboxStatus.CREATING,
        });

        try {
            const sandbox = await createDaytonaSandbox();

            await ctx.runAction(internal.sandbox.startSandboxServer, {
                featureBranchId: args.featureBranchId,
                sandboxId: sandbox.id,
            });

            return {
                success: true,
                sandbox: {
                    id: sandbox.id,
                    status: sandbox.state,
                    resources: sandbox.resources,
                    labels: sandbox.labels,
                },
            };
        } catch (error: any) {
            return await updateSandboxToFailed(ctx, args.featureBranchId, "", error.message);
        }
    },
});

export const startSandboxServer = internalAction({
    args: {
        featureBranchId: v.id("featureBranches"),
        sandboxId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Wait for sandbox to be in started state
            await pollSandboxStarted(args.sandboxId);

            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: SandboxStatus.STARTING_SERVER
            });

            // Create process session
            await createProcessSession(args.sandboxId);

            // Execute server start command
            await executeServerStart(args.sandboxId);

            // Get preview URL
            const previewURL = await getPreviewUrl(args.sandboxId);

            // Poll health endpoint
            await pollHealthEndpoint(previewURL.url);

            // Update to running state
            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: SandboxStatus.RUNNING,
                sandboxUrl: previewURL.url,
                sandboxUrlToken: previewURL.token,
            });

            return {
                success: true,
            };
        } catch (error: any) {
            return await updateSandboxToFailed(ctx, args.featureBranchId, args.sandboxId, error.message);
        }
    },
});

export const restartSandbox = internalAction({
    args: {
        featureBranchId: v.id("featureBranches"),
        sandboxId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Update status to starting server
            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: SandboxStatus.STARTING_SERVER,
            });

            // Start the stopped Daytona sandbox
            await startDaytonaSandbox(args.sandboxId);

            // Wait for sandbox to be in started state and start the server
            await ctx.runAction(internal.sandbox.startSandboxServer, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
            });

            return {
                success: true,
            };
        } catch (error: any) {
            return await updateSandboxToFailed(ctx, args.featureBranchId, args.sandboxId, error.message);
        }
    },
});

export const deleteSandbox = action({
    args: {
        sandboxId: v.string(),
    },
    handler: async (ctx, args) => {
        const response = await fetch(
            `https://app.daytona.io/api/sandbox/${args.sandboxId}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to delete sandbox ${args.sandboxId}:`, errorText);
            return {
                success: false,
                error: errorText,
            };
        }

        return {
            success: true,
        };
    },
});