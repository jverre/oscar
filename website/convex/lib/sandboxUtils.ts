import { SandboxStatus } from "../schema";

// Configuration constants
export const SANDBOX_SNAPSHOT = "oscar-sandbox-server:1.0.25";
export const SESSION_ID = "sandbox-express-43021";
export const SERVER_PORT = 43021;
export const POLL_MAX_ATTEMPTS = 30;
export const POLL_INTERVAL = 2000;

/**
 * Polls an endpoint until it returns a valid response
 */
export async function pollEndpoint(
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

/**
 * Updates sandbox status to failed
 */
export async function updateSandboxToFailed(
    ctx: any,
    featureBranchId: any,
    sandboxId: string,
    error: string
) {
    const { internal } = await import("../_generated/api");

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

/**
 * Starts a Daytona sandbox by calling the start API
 */
export async function startDaytonaSandbox(sandboxId: string): Promise<void> {
    const response = await fetch(
        `https://app.daytona.io/api/sandbox/${sandboxId}/start`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start sandbox: ${errorText}`);
    }
}

/**
 * Creates a new Daytona sandbox from a snapshot
 */
export async function createDaytonaSandbox(): Promise<any> {
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
        throw new Error(`Failed to create sandbox: ${errorText}`);
    }

    return await response.json();
}

/**
 * Polls until sandbox is in started state
 */
export async function pollSandboxStarted(sandboxId: string): Promise<void> {
    await pollEndpoint(
        `https://app.daytona.io/api/sandbox/${sandboxId}`,
        async (response) => {
            if (!response.ok) return false;
            const data = await response.json();
            return data.state === "started";
        },
        POLL_MAX_ATTEMPTS,
        POLL_INTERVAL,
        { "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}` }
    );
}

/**
 * Creates a process session in the sandbox
 */
export async function createProcessSession(sandboxId: string): Promise<void> {
    const response = await fetch(
        `https://app.daytona.io/api/toolbox/${sandboxId}/toolbox/process/session`,
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
        throw new Error(`Failed to create process session: ${errorText}`);
    }
}

/**
 * Executes the server start command in the sandbox
 */
export async function executeServerStart(sandboxId: string): Promise<void> {
    const response = await fetch(
        `https://app.daytona.io/api/toolbox/${sandboxId}/toolbox/process/session/${SESSION_ID}/exec`,
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
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to execute server start: ${errorText}`);
    }
}

/**
 * Gets the preview URL for a sandbox port
 */
export async function getPreviewUrl(sandboxId: string): Promise<{ url: string, token: string }> {
    const response = await fetch(
        `https://app.daytona.io/api/sandbox/${sandboxId}/ports/${SERVER_PORT}/preview-url`,
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.DAYTONA_API_KEY}`,
            },
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get preview URL: ${errorText}`);
    }

    return await response.json();
}

/**
 * Polls the health endpoint until it's ready
 */
export async function pollHealthEndpoint(previewUrl: string): Promise<void> {
    await pollEndpoint(
        previewUrl + '/health',
        async (response) => response.ok,
        POLL_MAX_ATTEMPTS,
        POLL_INTERVAL
    );
}
