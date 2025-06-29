import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Fly.io API configuration
const FLY_API_BASE_URL = "https://api.machines.dev";
const FLY_APP_NAME = process.env.FLY_APP_NAME || "oscar-git-machines";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN;

if (!FLY_API_TOKEN) {
  console.warn("FLY_API_TOKEN environment variable not set");
}

// Fly.io API request helper
async function flyApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!FLY_API_TOKEN) {
    throw new Error("Fly.io API token not configured");
  }

  const response = await fetch(`${FLY_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${FLY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fly.io API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Create a new Fly.io volume
export const createVolume = internalAction({
  args: {
    volumeName: v.string(),
    region: v.string(),
    sizeGb: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const volumeConfig = {
      name: args.volumeName,
      region: args.region,
      size_gb: args.sizeGb || 10, // Default 10GB
    };

    const volume = await flyApiRequest(`/v1/apps/${FLY_APP_NAME}/volumes`, {
      method: "POST",
      body: JSON.stringify(volumeConfig),
    });

    return {
      volumeId: volume.id,
      volumeName: volume.name,
      region: volume.region,
      sizeGb: volume.size_gb,
    };
  },
});

// Create a new Fly.io machine
export const createMachine = internalAction({
  args: {
    region: v.optional(v.string()),
    userId: v.id("users"),
    volumeName: v.optional(v.string()),
    autoStop: v.optional(v.boolean()),
    autoStart: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const region = args.region || "dfw";
    const mountPath = "/repos";
    const autoStop = args.autoStop ?? true;
    const autoStart = args.autoStart ?? true;
    
    // Create volume if specified
    let volumeInfo = null;
    if (args.volumeName) {
      volumeInfo = await ctx.runAction(internal.flyApi.createVolume, {
        volumeName: args.volumeName,
        region: region,
        sizeGb: 10,
      });
    }

    const machineConfig = {
      config: {
        image: "registry-1.docker.io/library/ubuntu:22.04",
        init: {
          exec: ["/bin/bash", "-c", [
            "apt-get update",
            "apt-get install -y git curl",
            `mkdir -p ${mountPath}`,
            "git config --global user.name 'Oscar Git'",
            "git config --global user.email 'git@oscar.dev'",
            "/bin/sleep inf"
          ].join(" && ")]
        },
        auto_destroy: false,
        restart: { policy: "on-failure" },
        guest: {
          cpu_kind: "shared",
          cpus: 1,
          memory_mb: 512
        },
        services: [{
          protocol: "tcp",
          internal_port: 22,
          auto_stop_machines: autoStop ? "stop" : "off",
          auto_start_machines: autoStart,
          min_machines_running: autoStart ? 0 : 1,
          ports: [{ port: 22 }]
        }],
        ...(volumeInfo && {
          mounts: [{
            volume: volumeInfo.volumeId,
            path: mountPath
          }]
        }),
        metadata: { 
          purpose: "oscar-git-operations",
          autoStop: autoStop.toString(),
          autoStart: autoStart.toString(),
          ...(volumeInfo && { volumeId: volumeInfo.volumeId })
        }
      },
      region: region,
      skip_launch: false,
      skip_service_registration: false
    };

    const machine = await flyApiRequest(`/v1/apps/${FLY_APP_NAME}/machines`, {
      method: "POST",
      body: JSON.stringify(machineConfig),
    });

    await ctx.runMutation(internal.flyMachines.createMachineRecord, {
      machineId: machine.id,
      appName: FLY_APP_NAME,
      region: machine.region,
      status: "creating",
      userId: args.userId,
      volumeId: volumeInfo?.volumeId,
      volumeName: volumeInfo?.volumeName,
      mountPath: volumeInfo ? mountPath : undefined,
      autoStop: autoStop,
      autoStart: autoStart,
    });

    return {
      machineId: machine.id,
      region: machine.region,
      status: machine.state,
    };
  },
});

// Execute a command on a Fly.io machine
export const execCommand = internalAction({
  args: {
    machineId: v.string(),
    command: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.flyMachines.touchMachineInternal, {
        machineId: args.machineId,
      });

      const result = await flyApiRequest(`/v1/apps/${FLY_APP_NAME}/machines/${args.machineId}/exec`, {
        method: "POST",
        body: JSON.stringify({ command: args.command }),
      });

      return result;
    } catch (error) {
      await ctx.runMutation(internal.flyMachines.updateMachineStatusInternal, {
        machineId: args.machineId,
        status: "error",
        metadata: {
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastErrorAt: Date.now(),
        },
      });
      throw error;
    }
  },
});

// Get machine status from Fly.io API
export const getMachineStatus = internalAction({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await flyApiRequest(`/v1/apps/${FLY_APP_NAME}/machines/${args.machineId}`);
    
    await ctx.runMutation(internal.flyMachines.updateMachineStatusInternal, {
      machineId: args.machineId,
      status: machine.state === "started" ? "running" : machine.state,
      metadata: {
        lastStatusCheck: Date.now(),
        flyState: machine.state,
      },
    });

    return {
      machineId: machine.id,
      state: machine.state,
      region: machine.region,
      created_at: machine.created_at,
    };
  },
});



// Start a Fly.io machine
export const startMachine = internalAction({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, args) => {
    await flyApiRequest(`/v1/apps/${FLY_APP_NAME}/machines/${args.machineId}/start`, {
      method: "POST",
    });

    await ctx.runMutation(internal.flyMachines.updateMachineStatusInternal, {
      machineId: args.machineId,
      status: "running",
    });

    return { success: true };
  },
});






