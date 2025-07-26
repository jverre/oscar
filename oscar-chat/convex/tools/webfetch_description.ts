export const webfetchDescription = `Fetches content from a specified URL using curl in the sandbox environment.

Usage notes:
- The URL must be a fully-formed valid URL starting with http:// or https://
- HTTP URLs will be automatically upgraded to HTTPS when possible
- You can specify an optional timeout in seconds (up to 120 seconds, default 30)
- The tool will return the raw content fetched from the URL
- This tool is read-only and does not modify any files
- Results may be truncated if the content is very large
- Use this tool when you need to retrieve web content for analysis or processing
- The tool uses curl from within the sandbox environment for fetching`;