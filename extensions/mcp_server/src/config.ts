/**
 * Centralized configuration for Oscar MCP server
 */

export interface OscarConfig {
  baseUrl: string;
}

/**
 * Parse command line arguments for Oscar configuration
 */
function parseCliArgs(): { url?: string } {
  const args = process.argv.slice(2);
  const config: { url?: string } = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && i + 1 < args.length) {
      config.url = args[i + 1];
      i++; // Skip the next argument since we consumed it
    }
  }
  
  return config;
}

/**
 * Get Oscar configuration with proper precedence:
 * 1. CLI argument --url
 * 2. Environment variable OSCAR_URL
 * 3. Environment variable OSCAR_DOMAIN (legacy)
 * 4. Default: https://www.getoscar.ai
 */
export function getOscarConfig(): OscarConfig {
  const cliArgs = parseCliArgs();
  const baseUrl = cliArgs.url || 
                  process.env.OSCAR_URL || 
                  process.env.OSCAR_DOMAIN || 
                  'https://www.getoscar.ai';
  
  return { baseUrl };
}