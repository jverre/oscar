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
        snapshot: 'claude-code-oscar:1751823179092',
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

// Setup Claude Code session in an existing sandbox
export const setupClaudeCodeSession = internalAction({
  args: {
    sessionDbId: v.id("claudeSessions"),
    userId: v.id("users"),
    sandboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DAYTONA_API_KEY;
    const baseUrl = process.env.DAYTONA_BASE_URL || 'https://api.daytona.io';
    console.log(`Environment DAYTONA_BASE_URL: ${process.env.DAYTONA_BASE_URL}`);
    console.log(`Final base URL: ${baseUrl}`);

    if (!apiKey) {
      await ctx.runMutation(internal.claudeSessions.updateSessionStatus, {
        sessionId: args.sessionDbId,
        status: "error",
        metadata: { error: "DAYTONA_API_KEY not configured" },
      });
      return;
    }

    try {
      // Step 1: Check sandbox status and start if needed
      console.log(`Checking sandbox status for: ${args.sandboxId}`);
      console.log(`Using base URL: ${baseUrl}`);
      console.log(`API key length: ${apiKey.length} characters`);
      
      const sandboxUrl = `${baseUrl}/sandbox/${args.sandboxId}`;
      console.log(`Full sandbox URL: ${sandboxUrl}`);
      
      let sandboxResponse;
      try {
        sandboxResponse = await fetch(sandboxUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        console.log(`Sandbox response status: ${sandboxResponse.status} ${sandboxResponse.statusText}`);
      } catch (fetchError) {
        console.error(`Network error during sandbox fetch:`, fetchError);
        
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const errorName = fetchError instanceof Error ? fetchError.name : 'Unknown';
        
        console.error(`Error name: ${errorName}`);
        console.error(`Error message: ${errorMessage}`);
        
        if (fetchError instanceof Error && 'cause' in fetchError) {
          console.error(`Error cause:`, fetchError.cause);
        }
        
        throw new Error(`Network error when fetching sandbox status: ${errorMessage}`);
      }

      if (!sandboxResponse.ok) {
        const errorText = await sandboxResponse.text();
        console.log(`Sandbox response error body: ${errorText}`);
        throw new Error(`Failed to get sandbox info: ${sandboxResponse.status} ${sandboxResponse.statusText}\n${errorText}`);
      }

      const sandbox = await sandboxResponse.json();
      console.log(`Sandbox state: ${sandbox.state}`);

      // Start sandbox if stopped or archived
      if (sandbox.state === 'stopped' || sandbox.state === 'archived') {
        console.log(`Starting sandbox...`);
        const startResponse = await fetch(`${baseUrl}/sandbox/${args.sandboxId}/start`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (!startResponse.ok) {
          throw new Error(`Failed to start sandbox: ${startResponse.status}`);
        }

        // Wait for sandbox to start
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Step 2: Check for existing sessions
      console.log(`Checking for existing sessions...`);
      const sessionsResponse = await fetch(`${baseUrl}/toolbox/${args.sandboxId}/toolbox/process/session`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      let existingWebTerminalSession = null;
      let serverAlreadyRunning = false;

      if (sessionsResponse.ok) {
        const sessions = await sessionsResponse.json();
        
        // Look for existing web terminal sessions
        for (const session of sessions) {
          if (session.sessionId && session.sessionId.includes('web-terminal')) {
            existingWebTerminalSession = session;
            
            // Check if server is running
            if (session.commands && session.commands.length > 0) {
              for (const cmd of session.commands) {
                if (cmd.command && cmd.command.includes('npm start') && cmd.exitCode === null) {
                  serverAlreadyRunning = true;
                  break;
                }
              }
            }
            break;
          }
        }
      }

      // Step 3: Create session or use existing
      let sessionId;
      
      if (existingWebTerminalSession && serverAlreadyRunning) {
        sessionId = existingWebTerminalSession.sessionId;
        console.log(`Using existing session: ${sessionId}`);
      } else {
        // Create new session
        sessionId = `web-terminal-${Date.now()}`;
        console.log(`Creating new session: ${sessionId}`);
        
        const sessionResponse = await fetch(`${baseUrl}/toolbox/${args.sandboxId}/toolbox/process/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            SessionId: sessionId
          }),
        });

        if (!sessionResponse.ok) {
          throw new Error(`Failed to create session: ${sessionResponse.status}`);
        }
      }

      // Step 4: Start server if not already running
      if (!serverAlreadyRunning) {
        console.log(`Starting web terminal server...`);
        
        // Fire and forget server startup
        fetch(`${baseUrl}/toolbox/${args.sandboxId}/toolbox/process/session/${sessionId}/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            command: 'cd /workspace && npm start',
            run_async: true
          }),
        }).catch(err => console.error('Failed to start server:', err));

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 5: Get preview URL and token
      console.log(`Getting preview URL and token...`);
      const previewResponse = await fetch(`${baseUrl}/sandbox/${args.sandboxId}/ports/3456/preview-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      let previewUrl = null;
      let previewToken = null;
      if (previewResponse.ok) {
        const previewText = await previewResponse.text();
        try {
          const previewData = JSON.parse(previewText);
          previewUrl = previewData.url;
          previewToken = previewData.token; // May be undefined
        } catch (e) {
          previewUrl = previewText; // In case it's just a plain URL
        }
        console.log(`Preview URL: ${previewUrl}`);
        console.log(`Preview token: ${previewToken || 'none'}`);
      } else {
        console.log(`Failed to get preview link: ${previewResponse.status} ${previewResponse.statusText}`);
      }

      // Update session with success
      const updateParams: any = {
        sessionId: args.sessionDbId,
        status: "running",
        sessionIdValue: sessionId,
        previewUrl,
        metadata: {
          sandboxState: sandbox.state,
          serverRunning: true,
        },
      };

      // Only include previewToken if it exists
      if (previewToken) {
        updateParams.previewToken = previewToken;
      }

      await ctx.runMutation(internal.claudeSessions.updateSessionStatus, updateParams);

      console.log(`Claude Code session setup complete!`);

    } catch (error) {
      console.error(`Failed to setup Claude Code session: ${error}`);
      
      await ctx.runMutation(internal.claudeSessions.updateSessionStatus, {
        sessionId: args.sessionDbId,
        status: "error",
        metadata: { 
          error: error instanceof Error ? error.message : String(error)
        },
      });
    }
  },
});

