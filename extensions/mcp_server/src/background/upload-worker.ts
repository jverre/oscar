/**
 * Background worker for processing upload jobs
 */

import { uploadQueue } from './upload-queue.js';
import { UploadJob } from '../types.js';
import { uploadCursorChat } from '../cursor/cursor-logger.js';
import { uploadClaudeChat } from '../claude/claude-logger.js';
import { logger } from '../logger.js';

class UploadWorker {
  private isRunning = false;
  private pollInterval = 100; // 100ms for faster response

  /**
   * Start the background worker
   */
  start(): void {
    if (this.isRunning) {
      logger.info('[Upload Worker] Already running');
      return;
    }

    this.isRunning = true;
    logger.info('[Upload Worker] Starting background upload worker');
    this.processQueue();
  }

  /**
   * Stop the background worker
   */
  stop(): void {
    this.isRunning = false;
    logger.info('[Upload Worker] Stopped background upload worker');
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        const job = uploadQueue.getNextJob();
        
        if (job) {
          await this.processJob(job);
        }
        
        // Wait before checking for next job
        await this.sleep(this.pollInterval);
      } catch (error) {
        logger.error(`[Upload Worker] Error in processing loop: ${error}`);
        await this.sleep(this.pollInterval);
      }
    }
  }

  /**
   * Process a single upload job
   */
  private async processJob(job: UploadJob): Promise<void> {
    logger.info(`[Upload Worker] Processing ${job.platform} upload for chat ${job.oscarChatId}`);

    try {
      await this.uploadByPlatform(job);
      logger.info(`[Upload Worker] ✅ Successfully uploaded chat ${job.oscarChatId}`);
    } catch (error) {
      logger.error(`[Upload Worker] ❌ Failed to upload chat ${job.oscarChatId}: ${error}`);
      
      // Additional error recovery - ensure we don't crash the worker
      if (error instanceof Error) {
        logger.error(`[Upload Worker] Error details: ${error.stack}`);
      }
      
      // Continue processing other jobs even if this one fails
    }
  }

  /**
   * Route upload to platform-specific handler
   */
  private async uploadByPlatform(job: UploadJob): Promise<void> {
    switch (job.platform) {
      case 'Cursor':
        await uploadCursorChat(job.oscarChatId);
        break;
      
      case 'Claude':
        await uploadClaudeChat(job.oscarChatId);
        break;
      
      case 'Chat GPT':
        // TODO: Implement Chat GPT upload
        throw new Error('Chat GPT upload not implemented yet');
      
      default:
        throw new Error(`Unknown platform: ${job.platform}`);
    }
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; queueSize: number } {
    return {
      isRunning: this.isRunning,
      queueSize: uploadQueue.size()
    };
  }
}

// Export singleton instance
export const uploadWorker = new UploadWorker();