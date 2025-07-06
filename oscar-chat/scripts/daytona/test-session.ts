#!/usr/bin/env node
/**
 * Test script to create a session and execute commands in a Daytona sandbox
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded environment variables from .env.local");
}

async function testSessionAndExecution(): Promise<void> {
  console.log("Testing Daytona session creation and command execution...");
  
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY not found in environment variables. Please set it in .env.local");
  }

  // You'll need to provide a sandbox ID to test with
  const sandboxId = process.argv[2];
  if (!sandboxId) {
    console.log("Usage: npx tsx test-session.ts <sandboxId>");
    console.log("Example: npx tsx test-session.ts your-sandbox-id-here");
    process.exit(1);
  }

  const apiKey = process.env.DAYTONA_API_KEY;
  const baseUrl = process.env.DAYTONA_BASE_URL || 'https://api.daytona.io';
  
  try {
    // Step 1: Check sandbox status and start if needed
    console.log(`\n=== Checking sandbox status ===`);
    const sandboxResponse = await fetch(`${baseUrl}/sandbox/${sandboxId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!sandboxResponse.ok) {
      const errorText = await sandboxResponse.text();
      throw new Error(`Failed to get sandbox info: ${sandboxResponse.status} ${sandboxResponse.statusText}\n${errorText}`);
    }

    const sandbox = await sandboxResponse.json();
    console.log(`Sandbox state: ${sandbox.state}`);

    if (sandbox.state === 'stopped' || sandbox.state === 'archived') {
      console.log(`\n=== Starting sandbox ===`);
      const startResponse = await fetch(`${baseUrl}/sandbox/${sandboxId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!startResponse.ok) {
        const errorText = await startResponse.text();
        throw new Error(`Failed to start sandbox: ${startResponse.status} ${startResponse.statusText}\n${errorText}`);
      }

      console.log(`✅ Sandbox started successfully`);
      // Wait a moment for sandbox to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else if (sandbox.state === 'started') {
      console.log(`✅ Sandbox is already running`);
    } else {
      console.log(`⚠️  Sandbox is in state: ${sandbox.state}`);
    }

    // Step 2: Check for existing sessions
    console.log(`\n=== Checking for existing sessions ===`);
    const sessionsResponse = await fetch(`${baseUrl}/toolbox/${sandboxId}/toolbox/process/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    let existingWebTerminalSession = null;
    let serverAlreadyRunning = false;

    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      console.log(`Found ${sessions.length} existing sessions`);
      
      // Look for web terminal sessions
      for (const session of sessions) {
        console.log(`\nSession ${session.sessionId}:`);
        if (session.sessionId && session.sessionId.includes('web-terminal')) {
          existingWebTerminalSession = session;
          
          // Check commands in this session
          if (session.commands && session.commands.length > 0) {
            for (const cmd of session.commands) {
              console.log(`  Command: ${cmd.command}`);
              console.log(`  Exit Code: ${cmd.exitCode}`);
              
              // Check if npm start is running (exitCode null means still running)
              if (cmd.command && cmd.command.includes('npm start') && cmd.exitCode === null) {
                serverAlreadyRunning = true;
                console.log(`  ✅ Web terminal server is already running!`);
              }
            }
          }
        }
      }
    }

    // Step 3: Create a session or use existing
    let sessionId;
    
    if (existingWebTerminalSession && serverAlreadyRunning) {
      sessionId = existingWebTerminalSession.sessionId;
      console.log(`\n✅ Using existing web terminal session: ${sessionId}`);
      console.log(`✅ Server is already running, skipping startup`);
    } else {
      // Create new session
      sessionId = `web-terminal-${Date.now()}`;
      console.log(`\n=== Creating new session in sandbox: ${sandboxId} ===`);
      console.log(`Session ID: ${sessionId}`);
      
      const sessionResponse = await fetch(`${baseUrl}/toolbox/${sandboxId}/toolbox/process/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          SessionId: sessionId
        }),
      });

      console.log(`Response status: ${sessionResponse.status} ${sessionResponse.statusText}`);
      const responseText = await sessionResponse.text();
      console.log(`Response body: ${responseText}`);

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.status} ${sessionResponse.statusText}\n${responseText}`);
      }

      try {
        if (responseText) JSON.parse(responseText);
      } catch (e) {
        console.log(`Warning: Could not parse response as JSON, but request was successful`);
      }
      
      console.log(`✅ Session created successfully: ${sessionId}`);
    }

    // Step 2: Execute a simple test command
    console.log(`\n=== Executing test command in session: ${sessionId} ===`);
    const execResponse = await fetch(`${baseUrl}/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        command: 'echo "Hello from Daytona session!" && pwd && ls -la'
      }),
    });

    console.log(`Exec response status: ${execResponse.status} ${execResponse.statusText}`);
    const execResponseText = await execResponse.text();
    console.log(`Exec response body: ${execResponseText}`);

    if (!execResponse.ok) {
      throw new Error(`Failed to execute command: ${execResponse.status} ${execResponse.statusText}\n${execResponseText}`);
    }

    let execResult;
    try {
      execResult = execResponseText ? JSON.parse(execResponseText) : {};
    } catch (e) {
      console.log(`Warning: Could not parse exec response as JSON, but request was successful`);
      execResult = { output: execResponseText };
    }
    
    console.log(`✅ Command executed successfully:`);
    console.log(JSON.stringify(execResult, null, 2));

    // Step 3: Test starting the web terminal server
    console.log(`\n=== Testing web terminal server startup ===`);
    const serverResponse = await fetch(`${baseUrl}/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        command: 'cd /workspace && ls -la && cat package.json'
      }),
    });

    if (!serverResponse.ok) {
      const errorText = await serverResponse.text();
      throw new Error(`Failed to check workspace: ${serverResponse.status} ${serverResponse.statusText}\n${errorText}`);
    }

    const serverResult = await serverResponse.json();
    console.log(`✅ Workspace check result:`);
    console.log(JSON.stringify(serverResult, null, 2));

    // Step 4: Start the server if not already running
    if (!serverAlreadyRunning) {
      console.log(`\n=== Starting web terminal server (fire-and-forget) ===`);
      
      // Fire off the request without waiting for response
      fetch(`${baseUrl}/toolbox/${sandboxId}/toolbox/process/session/${sessionId}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          command: 'cd /workspace && npm start',
          run_async: true
        }),
      }).then(response => {
        console.log(`✅ Server start request sent (status: ${response.status})`);
      }).catch((error: Error) => {
        console.log(`⚠️  Server start request failed: ${error.message}`);
      });
      
      console.log(`✅ Server start command dispatched (running in background)`);
      
      // Give the server a moment to start before checking preview URL
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`\n✅ Skipping server startup - already running`);
    }
    
    
    // Step 5: Get preview URL for the web terminal (port 3456)
    console.log(`\n=== Getting preview URL for port 3456 ===`);
    const previewResponse = await fetch(`${baseUrl}/sandbox/${sandboxId}/ports/3456/preview-url`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    console.log(`Preview response status: ${previewResponse.status} ${previewResponse.statusText}`);
    const previewResponseText = await previewResponse.text();
    console.log(`Preview response body: ${previewResponseText}`);

    let previewData;
    try {
      previewData = previewResponseText ? JSON.parse(previewResponseText) : {};
    } catch (e) {
      console.log(`Warning: Could not parse preview response as JSON, but request was successful`);
      previewData = { url: previewResponseText };
    }
    
    console.log(`✅ Preview URL retrieved successfully:`);
    console.log(JSON.stringify(previewData, null, 2));
    
    if (previewData.url) {
      console.log(`\n🌐 Access your web terminal at: ${previewData.url}`);
    }

    console.log(`\n🎉 All tests completed successfully!`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Sandbox ID: ${sandboxId}`);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error}`);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  testSessionAndExecution()
    .then(() => {
      console.log("\n✅ Session test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Session test failed:", error);
      process.exit(1);
    });
}

export { testSessionAndExecution };