import { action } from "./_generated/server";
import { internal } from "./_generated/api";

import { v } from "convex/values";

export const createSandbox = action({
    args: {
        featureBranchId: v.id("featureBranches"),
    },
    handler: async (ctx, args) => {
        const response = await fetch(
            "https://app.daytona.io/api/sandbox",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
                body: JSON.stringify({
                    snapshot: "oscar-sandbox-server:1.0.17",
                    language: "typescript",
                    public: true,
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: errorText,
            }
        }

        const sandbox = await response.json();

        await ctx.runMutation(internal.featureBranches.updateSandbox, {
            featureBranchId: args.featureBranchId,
            sandboxId: sandbox.id,
            sandboxStatus: sandbox.state
        });

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

async function waitForSandboxHealth(url: string, maxAttempts = 30, delay = 200) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const response = await fetch(url, {
            method: 'GET',
        });
        if (response.ok) {
            console.log(await response.text())
            return true;
        }
        console.log("Waiting for sandbox health...");
        attempts++;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

async function waitForSandbox(url: string, maxAttempts = 30, delay = 2000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
          }
        });
        const res_json = await response.json();
        if (response.ok && res_json.state === "started") {
          return true;
        }
      } catch (error) {
        console.log(`Attempt ${attempts + 1}: Sandbox not ready yet...`);
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Sandbox failed to start within timeout');
}

export const startSandboxServer = action({
    args: {
        featureBranchId: v.id("featureBranches"),
        sandboxId: v.string(),
    },
    handler: async (ctx, args) => {

        await waitForSandbox(`https://app.daytona.io/api/sandbox/${args.sandboxId}`);

        const SESSION_ID = "sandbox-express-43021";
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
            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: "failed",
                sandboxUrl: undefined,
                sandboxUrlToken: undefined,
            });

            return {
                success: false,
                error: errorText,
            }
        }
        console.log('created session');

        const responseStartServer = await fetch(
            `https://app.daytona.io/api/toolbox/${args.sandboxId}/toolbox/process/session/${SESSION_ID}/exec`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
                body: JSON.stringify({
                    command: "npm run start",
                    runAsync: true
                })
            }
        )

        console.log(await responseStartServer.text())

        if (!responseStartServer.ok) {
            const errorText = await responseStartServer.text();
            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: "failed",
                sandboxUrl: undefined,
                sandboxUrlToken: undefined,
            });

            return {
                success: false,
                error: errorText,
            }
        }

        const previewResponse = await fetch(`https://app.daytona.io/api/sandbox/${args.sandboxId}/ports/43021/preview-url`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
                },
            }
        );

        if (!previewResponse.ok) {
            const errorText = await previewResponse.text();
            
            await ctx.runMutation(internal.featureBranches.updateSandbox, {
                featureBranchId: args.featureBranchId,
                sandboxId: args.sandboxId,
                sandboxStatus: "failed",
                sandboxUrl: undefined,
                sandboxUrlToken: undefined,
            });

            return {
                success: false,
                error: errorText,
            }
        }

        const previewURL = await previewResponse.json();

        await waitForSandboxHealth(previewURL.url + '/health')

        await ctx.runMutation(internal.featureBranches.updateSandbox, {
            featureBranchId: args.featureBranchId,
            sandboxId: args.sandboxId,
            sandboxStatus: "running",
            sandboxUrl: previewURL.url,
            sandboxUrlToken: previewURL.token,
        });

        return {
            success: true,
        };
    },
});