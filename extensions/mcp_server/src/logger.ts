/**
 * File-based logging utility for MCP server
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_DIR = join(homedir(), 'oscar-mcp-logs');
const LOG_FILE = join(LOG_DIR, 'oscar-mcp.log');

// Ensure log directory exists
try {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create log directory:', error);
}

class Logger {
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  private writeLog(level: string, message: string): void {
    try {
      const logMessage = this.formatMessage(level, message);
      appendFileSync(LOG_FILE, logMessage);
      
      // Note: Console logging removed to prevent interference with MCP stdio protocol
    } catch (error) {
      // Only log file write errors to stderr, and only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  info(message: string): void {
    this.writeLog('INFO', message);
  }

  error(message: string): void {
    this.writeLog('ERROR', message);
  }

  debug(message: string): void {
    this.writeLog('DEBUG', message);
  }

  warn(message: string): void {
    this.writeLog('WARN', message);
  }

  // Clear log file
  clear(): void {
    try {
      writeFileSync(LOG_FILE, '');
      this.info('Log file cleared');
    } catch (error) {
      console.error('Failed to clear log file:', error);
    }
  }

  // Get log file path for debugging
  getLogPath(): string {
    return LOG_FILE;
  }
}

export const logger = new Logger();