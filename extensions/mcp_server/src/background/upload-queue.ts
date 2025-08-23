/**
 * Background upload queue management
 */

import { UploadJob } from '../types.js';
import { logger } from '../logger.js';

class UploadQueue {
  private queue: UploadJob[] = [];

  /**
   * Add a new upload job to the queue
   */
  addJob(job: UploadJob): void {
    this.queue.push(job);
    logger.info(`[Upload Queue] Added job for ${job.platform} chat ${job.oscarChatId}`);
  }

  /**
   * Get the next job from the queue (oldest first)
   */
  getNextJob(): UploadJob | null {
    return this.queue.shift() || null;
  }

  /**
   * Get all pending jobs (for debugging)
   */
  getPendingJobs(): UploadJob[] {
    return [...this.queue];
  }

  /**
   * Remove a specific job from the queue
   */
  removeJob(oscarChatId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(job => job.oscarChatId !== oscarChatId);
    return this.queue.length < initialLength;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear the entire queue
   */
  clear(): void {
    this.queue = [];
  }
}

// Export singleton instance
export const uploadQueue = new UploadQueue();