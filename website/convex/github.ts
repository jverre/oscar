import { v } from "convex/values";
import { mutation, action, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Save GitHub App installation ID when user completes installation
export const saveInstallation = mutation({
  args: {
    installationId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(userId, {
      githubInstallationId: args.installationId,
    });

    return { success: true };
  },
});

// Base64 URL encode helper
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Generate JWT for GitHub App authentication using Web Crypto API
// This is the standard way GitHub Apps authenticate - you create a JWT using your private key
async function generateJWT(appId: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iat: now - 60, // Issued at time (60 seconds in the past to account for clock drift)
    exp: now + 600, // Expiration time (10 minutes maximum allowed by GitHub)
    iss: appId, // GitHub App's identifier
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key - handle both PKCS#1 and PKCS#8 formats
  let keyData = privateKey
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
    .replace(/-----END RSA PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));

  // Try PKCS#8 first, then fall back to PKCS#1 conversion
  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
  } catch (e) {
    // If PKCS#8 fails, the key is likely PKCS#1 format
    // We need to convert PKCS#1 to PKCS#8
    throw new Error("Private key must be in PKCS#8 format. Convert using: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in private-key.pem -out private-key-pkcs8.pem");
  }

  // Sign the data
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  // Encode signature
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${signatureInput}.${encodedSignature}`;
}

// Generate installation access token (valid for 1 hour)
async function generateInstallationToken(
  installationId: string,
  appId: string,
  privateKey: string
): Promise<string> {
  // Generate JWT using app private key
  const jwtToken = await generateJWT(appId, privateKey);

  // Exchange JWT for installation token
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    // If 404, the installation was likely uninstalled
    if (response.status === 404) {
      throw new Error("INSTALLATION_NOT_FOUND");
    }

    throw new Error(`Failed to generate installation token: ${error}`);
  }

  const data = await response.json();
  return data.token;
}

// Internal query to get user by ID
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Internal mutation to clear GitHub installation
export const clearInstallation = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }

    await ctx.db.patch(userId, {
      githubInstallationId: undefined,
    });
  },
});

// List repositories accessible by the GitHub App installation
export const listRepositories = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, error: "NOT_AUTHENTICATED" };
    }

    const user = await ctx.runQuery(internal.github.getUserById, { userId });

    if (!user?.githubInstallationId) {
      return { success: false, error: "NOT_INSTALLED" };
    }

    // Get environment variables
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      return { success: false, error: "NOT_CONFIGURED" };
    }

    try {
      // Generate installation token (valid for 1 hour)
      const token = await generateInstallationToken(
        user.githubInstallationId,
        appId,
        privateKey
      );

      // Fetch repositories accessible to this installation
      const response = await fetch(
        "https://api.github.com/installation/repositories",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `FETCH_FAILED: ${error}` };
      }

      const data = await response.json();

      // Return simplified repository data
      return {
        success: true,
        repositories: data.repositories.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          cloneUrl: repo.clone_url,
          htmlUrl: repo.html_url,
        })),
      };
    } catch (error) {
      // If installation not found, clear it from the user record
      if (error instanceof Error && error.message === "INSTALLATION_NOT_FOUND") {
        await ctx.runMutation(internal.github.clearInstallation);
        return { success: false, error: "INSTALLATION_NOT_FOUND" };
      }
      return { success: false, error: `UNKNOWN_ERROR: ${error}` };
    }
  },
});

// Generate a clone token for sandbox use
export const getCloneToken = action({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.runQuery(internal.github.getUserById, { userId });

    if (!user?.githubInstallationId) {
      throw new Error("GitHub App not installed");
    }

    // Get environment variables
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    if (!appId || !privateKey) {
      throw new Error("GitHub App credentials not configured");
    }

    // Generate fresh installation token (valid for 1 hour)
    const token = await generateInstallationToken(
      user.githubInstallationId,
      appId,
      privateKey
    );

    return { token };
  },
});
