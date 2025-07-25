export const bashDescription = `Execute bash commands in the sandbox environment with optional timeout, ensuring proper handling and security measures.

Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use the list_files tool to verify the parent directory exists and is the correct location
   - For example, before running "mkdir foo/bar", first check that "foo" exists and is the intended parent directory

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
   - Examples of proper quoting:
     - cd "/Users/name/My Documents" (correct)
     - cd /Users/name/My Documents (incorrect - will fail)
     - python "/path/with spaces/script.py" (correct)
     - python /path/with spaces/script.py (incorrect - will fail)
   - After ensuring proper quoting, execute the command
   - Capture the output of the command

Usage notes:
  - The command argument is required
  - You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes)
  - It is very helpful if you write a clear, concise description of what this command does in 5-10 words
  - If the output exceeds 30000 characters, output will be truncated before being returned to you
  - VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use the appropriate file system tools. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use read_file and list_files to read files
  - If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which is pre-installed in the sandbox
  - When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings)
  - Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if explicitly requested
    <good-example>
    pytest /foo/bar/tests
    </good-example>
    <bad-example>
    cd /foo/bar && pytest tests
    </bad-example>`;