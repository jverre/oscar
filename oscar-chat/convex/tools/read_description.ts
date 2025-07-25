export const readDescription = `Reads a file from the sandbox filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files in the sandbox. If a path is provided, assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- This tool allows reading images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as the system is multimodal
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful
- You will regularly be asked to read screenshots. If a path to a screenshot is provided, ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents`;