import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import { v } from "convex/values";
import { SandboxStatus } from "./schema";

// Configuration constants
const SANDBOX_SNAPSHOT = "oscar-sandbox-server:1.0.24";
const SESSION_ID = "sandbox-express-43021";
const SERVER_PORT = 43021;
const POLL_MAX_ATTEMPTS = 30;
const POLL_INTERVAL = 2000;

async function pollEndpoint(
    url: string,
    validateResponse: (response: Response) => Promise<boolean>,
    maxAttempts: number,
    interval: number,
    headers?: Record<string, string>
): Promise<void> {
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
            });

            const isValid = await validateResponse(response);
            if (isValid) {
                return;
            }
        } catch (error) {
            console.log(`Attempt ${attempts + 1}: Endpoint not ready yet...`);
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Endpoint failed to become ready within timeout (${maxAttempts * interval}ms)`);
}

async function updateSandboxToFailed(
    ctx: any,
    featureBranchId: any,
    sandboxId: string,
    error: string
) {
    await ctx.runMutation(internal.featureBranches.updateSandbox, {
        featureBranchId: featureBranchId,
        sandboxId: sandboxId,
        sandboxStatus: SandboxStatus.FAILED,
        sandboxUrl: undefined,
        sandboxUrlToken: undefined,
    });

    return {
        success: false,
        error: error,
    };
}

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

        const response = await fetch(
            "https://app.daytona.io/api/sandbox",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
                body: JSON.stringify({
                    snapshot: SANDBOX_SNAPSHOT,
                    language: "typescript",
                    public: true,
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return await updateSandboxToFailed(ctx, args.featureBranchId, "", errorText);
        }

        const sandbox = await response.json();

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
    },
});

export const startSandboxServer = action({
    args: {
        featureBranchId: v.id("featureBranches"),
        sandboxId: v.string(),
    },
    handler: async (ctx, args) => {

        await pollEndpoint(
            `https://app.daytona.io/api/sandbox/${args.sandboxId}`,
            async (response) => {
                if (!response.ok) return false;
                const data = await response.json();
                return data.state === "started";
            },
            POLL_MAX_ATTEMPTS,
            POLL_INTERVAL,
            { "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}` }
        );

        await ctx.runMutation(internal.featureBranches.updateSandbox, {
            featureBranchId: args.featureBranchId,
            sandboxId: args.sandboxId,
            sandboxStatus: SandboxStatus.STARTING_SERVER
        });
        const response = await fetch(
            `https://app.daytona.io/api/toolbox/${args.sandboxId}/toolbox/process/session`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
                body: JSON.stringify({
                    sessionId: SESSION_ID
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return await updateSandboxToFailed(ctx, args.featureBranchId, args.sandboxId, errorText);
        }

        const responseStartServer = await fetch(
            `https://app.daytona.io/api/toolbox/${args.sandboxId}/toolbox/process/session/${SESSION_ID}/exec`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
                body: JSON.stringify({
                    command: "cd /server && TERMINAL_CWD=/home npm run start",
                    runAsync: true
                })
            }
        )

        if (!responseStartServer.ok) {
            const errorText = await responseStartServer.text();
            return await updateSandboxToFailed(ctx, args.featureBranchId, args.sandboxId, errorText);
        }

        const previewResponse = await fetch(`https://app.daytona.io/api/sandbox/${args.sandboxId}/ports/${SERVER_PORT}/preview-url`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
            }
        );

        if (!previewResponse.ok) {
            const errorText = await previewResponse.text();
            return await updateSandboxToFailed(ctx, args.featureBranchId, args.sandboxId, errorText);
        }

        const previewURL = await previewResponse.json();

        await pollEndpoint(
            previewURL.url + '/health',
            async (response) => response.ok,
            POLL_MAX_ATTEMPTS,
            POLL_INTERVAL
        );

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