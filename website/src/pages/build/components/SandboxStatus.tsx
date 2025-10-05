interface SandboxStatusProps {
  status?: string
}

const statusMessages: Record<string, { title: string; description: string }> = {
  creating: {
    title: "Creating VM",
    description: "Setting up your development environment..."
  },
  starting_server: {
    title: "Starting Server",
    description: "Launching your application server..."
  },
  running: {
    title: "Ready",
    description: "Your environment is ready!"
  },
  failed: {
    title: "Failed",
    description: "Failed to start your environment. Please try again."
  },
  stopped: {
    title: "Stopped",
    description: "Your environment has been stopped."
  }
}

export function SandboxStatus({ status }: SandboxStatusProps) {
  const message = status ? statusMessages[status] : { title: "Loading", description: "Preparing your environment..." }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center space-y-4">
        <div className="text-2xl font-semibold text-sage-green-800">
          {message.title}
        </div>
        <div className="text-sage-green-600">
          {message.description}
        </div>
        {status !== 'failed' && status !== 'stopped' && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-green-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}
