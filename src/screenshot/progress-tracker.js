/**
 * Progress Tracker
 * 
 * Tracks and persists batch processing progress for resuming interrupted sessions
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Progress Tracker Class
 */
export class ProgressTracker {
  constructor(config = {}) {
    this.config = {
      progressFileName: 'batch-progress.json',
      backupFileName: 'batch-progress-backup.json',
      autoSaveInterval: 30000, // Auto-save every 30 seconds
      maxBackupFiles: 5,
      ...config
    };
    
    this.progress = {
      sessionId: null,
      startTime: null,
      lastUpdate: null,
      totalSymbols: 0,
      processedSymbols: 0,
      currentBatch: 0,
      totalBatches: 0,
      completedBatches: [],
      failedSymbols: [],
      successfulSymbols: [],
      batchResults: [],
      statistics: {
        totalProcessingTime: 0,
        averageTimePerScreenshot: 0,
        successRate: 0,
        errorRate: 0
      },
      config: {},
      metadata: {
        version: '1.0.0',
        createdBy: 'BatchProcessor',
        lastBackup: null
      }
    };
    
    this.sessionDir = null;
    this.autoSaveTimer = null;
  }

  /**
   * Initialize progress tracking for a new session
   * @param {string} sessionDir - Session directory path
   * @param {Array} symbols - Array of symbols to process
   * @param {Object} config - Processing configuration
   */
  initialize(sessionDir, symbols, config) {
    this.sessionDir = sessionDir;
    
    this.progress = {
      ...this.progress,
      sessionId: this.generateSessionId(),
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      totalSymbols: symbols.length,
      processedSymbols: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(symbols.length / config.batchSize),
      completedBatches: [],
      failedSymbols: [],
      successfulSymbols: [],
      batchResults: [],
      config: {
        batchSize: config.batchSize,
        delayBetweenScreenshots: config.delayBetweenScreenshots,
        delayBetweenBatches: config.delayBetweenBatches,
        maxConcurrentBrowsers: config.maxConcurrentBrowsers,
        retryFailedScreenshots: config.retryFailedScreenshots
      },
      statistics: {
        totalProcessingTime: 0,
        averageTimePerScreenshot: 0,
        successRate: 0,
        errorRate: 0
      }
    };

    // Start auto-save timer
    this.startAutoSave();
    
    // Save initial progress
    this.saveProgress();
  }

  /**
   * Update progress after processing a batch
   * @param {number} batchNumber - Batch number
   * @param {Object} batchResult - Batch processing result
   */
  updateBatchProgress(batchNumber, batchResult) {
    this.progress.currentBatch = batchNumber;
    this.progress.lastUpdate = new Date().toISOString();
    
    // Add batch to completed batches
    if (!this.progress.completedBatches.includes(batchNumber)) {
      this.progress.completedBatches.push(batchNumber);
    }
    
    // Update processed symbols count
    this.progress.processedSymbols += batchResult.successful;
    
    // Add successful symbols
    if (batchResult.successfulSymbols) {
      this.progress.successfulSymbols.push(...batchResult.successfulSymbols);
    }
    
    // Add failed symbols
    if (batchResult.failedSymbols) {
      this.progress.failedSymbols.push(...batchResult.failedSymbols);
    }
    
    // Store batch result
    this.progress.batchResults.push({
      batchNumber,
      timestamp: new Date().toISOString(),
      successful: batchResult.successful,
      failed: batchResult.failed,
      processingTime: batchResult.processingTime || 0,
      symbols: batchResult.symbols || []
    });
    
    // Update statistics
    this.updateStatistics();
    
    // Save progress
    this.saveProgress();
  }

  /**
   * Update progress for individual screenshot
   * @param {string} symbol - Cryptocurrency symbol
   * @param {boolean} success - Whether screenshot was successful
   * @param {Object} details - Additional details
   */
  updateScreenshotProgress(symbol, success, details = {}) {
    this.progress.lastUpdate = new Date().toISOString();
    
    if (success) {
      if (!this.progress.successfulSymbols.includes(symbol)) {
        this.progress.successfulSymbols.push(symbol);
      }
    } else {
      if (!this.progress.failedSymbols.find(f => f.symbol === symbol)) {
        this.progress.failedSymbols.push({
          symbol,
          timestamp: new Date().toISOString(),
          error: details.error || 'Unknown error',
          attempt: details.attempt || 1
        });
      }
    }
    
    // Update statistics
    this.updateStatistics();
  }

  /**
   * Update processing statistics
   */
  updateStatistics() {
    const now = new Date();
    const startTime = new Date(this.progress.startTime);
    this.progress.statistics.totalProcessingTime = Math.round((now - startTime) / 1000);
    
    if (this.progress.processedSymbols > 0) {
      this.progress.statistics.averageTimePerScreenshot = 
        Math.round(this.progress.statistics.totalProcessingTime / this.progress.processedSymbols);
    }
    
    const totalAttempts = this.progress.successfulSymbols.length + this.progress.failedSymbols.length;
    if (totalAttempts > 0) {
      this.progress.statistics.successRate = 
        ((this.progress.successfulSymbols.length / totalAttempts) * 100).toFixed(2);
      this.progress.statistics.errorRate = 
        ((this.progress.failedSymbols.length / totalAttempts) * 100).toFixed(2);
    }
  }

  /**
   * Save progress to file
   */
  saveProgress() {
    if (!this.sessionDir) {
      console.warn('⚠️  Cannot save progress: session directory not set');
      return;
    }

    try {
      const progressPath = join(this.sessionDir, this.config.progressFileName);
      const backupPath = join(this.sessionDir, this.config.backupFileName);
      
      // Create backup of existing progress file
      if (existsSync(progressPath)) {
        writeFileSync(backupPath, readFileSync(progressPath));
      }
      
      // Save current progress
      writeFileSync(progressPath, JSON.stringify(this.progress, null, 2));
      
      // Update backup timestamp
      this.progress.metadata.lastBackup = new Date().toISOString();
      
    } catch (error) {
      console.error('❌ Failed to save progress:', error.message);
    }
  }

  /**
   * Load progress from file
   * @param {string} sessionDir - Session directory path
   * @returns {Object|null} Loaded progress or null if not found
   */
  loadProgress(sessionDir) {
    try {
      const progressPath = join(sessionDir, this.config.progressFileName);
      
      if (!existsSync(progressPath)) {
        return null;
      }
      
      const progressData = JSON.parse(readFileSync(progressPath, 'utf8'));
      this.progress = { ...this.progress, ...progressData };
      this.sessionDir = sessionDir;
      
      console.log(`📋 Loaded progress: ${this.progress.processedSymbols}/${this.progress.totalSymbols} processed`);
      return this.progress;
      
    } catch (error) {
      console.error('❌ Failed to load progress:', error.message);
      return null;
    }
  }

  /**
   * Resume progress from previous session
   * @param {Array} symbols - Original symbols array
   * @returns {Object} Resume information
   */
  resumeProgress(symbols) {
    const resumeInfo = {
      canResume: false,
      remainingSymbols: symbols,
      completedBatches: [],
      failedSymbols: [],
      statistics: null
    };

    if (!this.progress.sessionId) {
      return resumeInfo;
    }

    // Get remaining symbols
    const processedSymbols = this.progress.successfulSymbols.concat(
      this.progress.failedSymbols.map(f => f.symbol)
    );
    resumeInfo.remainingSymbols = symbols.filter(symbol => !processedSymbols.includes(symbol));
    
    resumeInfo.completedBatches = [...this.progress.completedBatches];
    resumeInfo.failedSymbols = [...this.progress.failedSymbols];
    resumeInfo.statistics = { ...this.progress.statistics };
    resumeInfo.canResume = resumeInfo.remainingSymbols.length < symbols.length;

    return resumeInfo;
  }

  /**
   * Get current progress status
   * @returns {Object} Current progress status
   */
  getProgressStatus() {
    const percentage = this.progress.totalSymbols > 0 ? 
      ((this.progress.processedSymbols / this.progress.totalSymbols) * 100).toFixed(2) : 0;
    
    const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining();
    
    return {
      sessionId: this.progress.sessionId,
      percentage: parseFloat(percentage),
      processed: this.progress.processedSymbols,
      total: this.progress.totalSymbols,
      currentBatch: this.progress.currentBatch,
      totalBatches: this.progress.totalBatches,
      completedBatches: this.progress.completedBatches.length,
      successful: this.progress.successfulSymbols.length,
      failed: this.progress.failedSymbols.length,
      estimatedTimeRemaining,
      statistics: this.progress.statistics,
      lastUpdate: this.progress.lastUpdate
    };
  }

  /**
   * Calculate estimated time remaining
   * @returns {number} Estimated seconds remaining
   */
  calculateEstimatedTimeRemaining() {
    if (this.progress.processedSymbols === 0) {
      return 0;
    }
    
    const remainingSymbols = this.progress.totalSymbols - this.progress.processedSymbols;
    const averageTimePerSymbol = this.progress.statistics.averageTimePerScreenshot;
    
    return Math.round(remainingSymbols * averageTimePerSymbol);
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const random = Math.random().toString(36).substring(2, 8);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.saveProgress();
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Finalize progress tracking
   * @param {Object} finalResults - Final processing results
   */
  finalize(finalResults) {
    this.progress.lastUpdate = new Date().toISOString();
    this.progress.statistics = {
      ...this.progress.statistics,
      finalSuccessRate: finalResults.successRate || 0,
      totalProcessingTime: this.progress.statistics.totalProcessingTime,
      averageTimePerScreenshot: this.progress.statistics.averageTimePerScreenshot
    };
    
    // Stop auto-save
    this.stopAutoSave();
    
    // Save final progress
    this.saveProgress();
    
    // Create final summary
    const summary = {
      sessionId: this.progress.sessionId,
      startTime: this.progress.startTime,
      endTime: this.progress.lastUpdate,
      totalSymbols: this.progress.totalSymbols,
      successful: this.progress.successfulSymbols.length,
      failed: this.progress.failedSymbols.length,
      successRate: this.progress.statistics.successRate,
      totalProcessingTime: this.progress.statistics.totalProcessingTime,
      averageTimePerScreenshot: this.progress.statistics.averageTimePerScreenshot,
      config: this.progress.config,
      statistics: this.progress.statistics
    };
    
    return summary;
  }

  /**
   * Clean up old backup files
   */
  cleanupBackups() {
    // Implementation for cleaning up old backup files
    // This would scan the session directory and remove old backup files
    // keeping only the most recent ones up to maxBackupFiles
  }

  /**
   * Export progress data
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported data
   */
  exportProgress(format = 'json') {
    if (format === 'json') {
      return JSON.stringify(this.progress, null, 2);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvData = [
        ['Symbol', 'Status', 'Timestamp', 'Error'],
        ...this.progress.successfulSymbols.map(symbol => [symbol, 'Success', '', '']),
        ...this.progress.failedSymbols.map(f => [f.symbol, 'Failed', f.timestamp, f.error])
      ];
      
      return csvData.map(row => row.join(',')).join('\n');
    }
    
    return '';
  }
}
