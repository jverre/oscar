export const startDescription = `Updates the start command for a plugin and creates a new sandbox with tunneling support.

This tool manages the complete workflow for updating a plugin's start command:
1. Updates the plugin's start command and port in the database
2. Creates a new sandbox from the current snapshot with the specified port exposed
3. Starts the service in the background using the new start command
4. Creates a tunnel and updates the sandbox URL
5. Creates a snapshot after successful setup

Usage:
- plugin_id: The ID of the plugin to update (required)
- start_command: The new start command to set (required)
- port: The port number the service will run on (required, 1-65535)

The tool will automatically:
- Validate the port range
- Create a new sandbox with proper tunnel configuration
- Run the start command in the background
- Generate and store the public tunnel URL
- Handle cleanup of resources if errors occur

Note: This creates a new sandbox to ensure proper port tunneling setup. The old sandbox will be terminated after successful migration.`;