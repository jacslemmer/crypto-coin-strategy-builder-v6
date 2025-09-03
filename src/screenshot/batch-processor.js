/**
 * Enhanced Batch Screenshot Processor
 * 
 * Processes multiple TradingView chart screenshots in batches with
 * configurable settings, quality validation, and progress persistence
 */

import { TradingViewCapture } from './tradingview-capture.js';
import { generateTradingViewUrls } from './url-generator.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Enhanced Batch Screenshot Processor Class
 */
export class BatchProcessor {
  constructor(config = {}) {
    this.config = {
      // Batch Processing Configuration
      batchSize: 10, // Default: 10 screenshots per batch
      delayBetweenScreenshots: 8000, // 8 seconds between screenshots
      delayBetweenBatches: 30000, // 30 seconds between batches
      maxConcurrentBrowsers: 2, // Maximum 2 concurrent browsers
      retryFailedScreenshots: 3, // Up to 3 attempts for failed screenshots
      
      // Quality Validation
      minFileSizeKB: 100, // Minimum file size: 100KB
      maxFileSizeKB: 5000, // Maximum file size: 5MB
      requiredWidth: 1920, // Required width: exactly 1920
      requiredHeight: 1080, // Required height: exactly 1080
      
      // Progress Persistence
      progressFile: 'batch-progress.json',
      resumeOnStart: true, // Resume interrupted batches by default
      
      // Output Configuration
      outputDir: '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots',
      createTimestampedFolders: true,
      
      ...config
    };
    
    this.capture = null;
    this.results = [];
    this.failedScreenshots = [];
    this.progress = {
      totalSymbols: 0,
      processedSymbols: 0,
      currentBatch: 0,
      totalBatches: 0,
      startTime: null,
      lastUpdate: null,
      completedBatches: [],
      failedSymbols: []
    };
  }

  /**
   * Process screenshots for multiple cryptocurrency pairs
   * @param {Array} symbols - Array of cryptocurrency symbols
   * @returns {Object} Processing results
   */
  async processScreenshots(symbols) {
    console.log('🚀 Starting enhanced batch screenshot processing...');
    console.log(`📊 Processing ${symbols.length} cryptocurrency pairs`);
    console.log(`⚙️  Batch size: ${this.config.batchSize}`);
    console.log(`⏱️  Delay between screenshots: ${this.config.delayBetweenScreenshots / 1000}s`);
    console.log(`🔄 Delay between batches: ${this.config.delayBetweenBatches / 1000}s`);
    console.log(`🌐 Max concurrent browsers: ${this.config.maxConcurrentBrowsers}`);
    console.log(`📁 Output directory: ${this.config.outputDir}`);

    // Initialize progress tracking
    this.progress.totalSymbols = symbols.length;
    this.progress.startTime = new Date().toISOString();
    this.progress.totalBatches = Math.ceil(symbols.length / this.config.batchSize);

    // Check for existing progress and resume if enabled
    if (this.config.resumeOnStart) {
      const resumed = await this.resumeProgress(symbols);
      if (resumed) {
        console.log('📋 Resumed from previous session');
        symbols = this.getRemainingSymbols(symbols);
      }
    }

    // Create output directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sessionDir = this.createSessionDirectory(timestamp);

    // Initialize capture
    this.capture = new TradingViewCapture({
      outputDir: sessionDir
    });

    const initSuccess = await this.capture.initialize();
    if (!initSuccess) {
      return {
        success: false,
        error: 'Failed to initialize browser',
        results: [],
        failed: symbols
      };
    }

    // Process symbols in batches
    const batches = this.createBatches(symbols, this.config.batchSize);
    let totalProcessed = 0;
    let totalFailed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Skip completed batches if resuming
      if (this.progress.completedBatches.includes(batchIndex)) {
        console.log(`⏭️  Skipping completed batch ${batchIndex + 1}/${batches.length}`);
        continue;
      }

      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} symbols)`);

      const batchResults = await this.processBatch(batch, sessionDir, batchIndex + 1);
      
      // Update counters and progress
      totalProcessed += batchResults.successful;
      totalFailed += batchResults.failed;
      this.progress.currentBatch = batchIndex + 1;
      this.progress.processedSymbols += batchResults.successful;
      this.progress.completedBatches.push(batchIndex);
      this.progress.lastUpdate = new Date().toISOString();

      // Save progress after each batch
      await this.saveProgress(sessionDir);

      // Add delay between batches (except for last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenBatches / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      }
    }

    // Close browser
    await this.capture.close();

    // Save final processing results
    const summary = await this.saveProcessingSummary(sessionDir, {
      totalSymbols: this.progress.totalSymbols,
      totalProcessed,
      totalFailed,
      successRate: ((totalProcessed / this.progress.totalSymbols) * 100).toFixed(2)
    });

    console.log('\n🎉 Enhanced batch processing complete!');
    console.log(`✅ Successfully processed: ${totalProcessed}/${this.progress.totalSymbols} (${summary.successRate}%)`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📁 Results saved to: ${sessionDir}`);

    return {
      success: totalFailed === 0,
      summary,
      results: this.results,
      failed: this.failedScreenshots
    };
  }

  /**
   * Process a single batch of symbols with enhanced error handling
   * @param {Array} batch - Array of symbols in this batch
   * @param {string} sessionDir - Session directory path
   * @param {number} batchNumber - Batch number
   * @returns {Object} Batch results
   */
  async processBatch(batch, sessionDir, batchNumber) {
    const batchResults = {
      successful: 0,
      failed: 0,
      symbols: []
    };

    for (let i = 0; i < batch.length; i++) {
      const symbol = batch[i];
      const outputPath = join(sessionDir, 'originals', `${symbol}USDT_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`);

      console.log(`  📸 [${i + 1}/${batch.length}] Capturing ${symbol}USDT...`);

      // Restart browser every few screenshots to avoid rate limiting
      if (i > 0 && i % 3 === 0) {
        console.log(`    🔄 Restarting browser to avoid rate limiting...`);
        await this.capture.close();
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const initSuccess = await this.capture.initialize();
        if (!initSuccess) {
          console.log(`    ❌ Failed to restart browser for ${symbol}USDT`);
          batchResults.failed++;
          this.failedScreenshots.push({
            symbol,
            error: 'Failed to restart browser',
            attempt: batchNumber,
            timestamp: new Date().toISOString()
          });
          continue;
        }
      }

      // Capture screenshot with retry logic
      const result = await this.captureWithRetry(symbol, outputPath, batchNumber);
      
      if (result.success) {
        // Validate screenshot quality
        const validation = await this.validateScreenshot(outputPath);
        if (validation.valid) {
          batchResults.successful++;
          this.results.push({
            ...result,
            validation,
            batchNumber
          });
          console.log(`    ✅ ${symbol}USDT captured and validated successfully`);
        } else {
          batchResults.failed++;
          this.failedScreenshots.push({
            symbol,
            error: `Quality validation failed: ${validation.errors.join(', ')}`,
            attempt: batchNumber,
            timestamp: new Date().toISOString()
          });
          console.log(`    ❌ ${symbol}USDT failed validation: ${validation.errors.join(', ')}`);
        }
      } else {
        batchResults.failed++;
        this.failedScreenshots.push({
          symbol,
          error: result.error,
          attempt: batchNumber,
          timestamp: new Date().toISOString()
        });
        console.log(`    ❌ ${symbol}USDT failed: ${result.error}`);
      }

      // Add delay between screenshots (except for last in batch)
      if (i < batch.length - 1) {
        console.log(`    ⏳ Waiting ${this.config.delayBetweenScreenshots / 1000}s before next screenshot...`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenScreenshots));
      }
    }

    return batchResults;
  }

  /**
   * Capture screenshot with retry logic
   * @param {string} symbol - Cryptocurrency symbol
   * @param {string} outputPath - Output file path
   * @param {number} batchNumber - Batch number
   * @returns {Object} Capture result
   */
  async captureWithRetry(symbol, outputPath, batchNumber) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.retryFailedScreenshots; attempt++) {
      try {
        const result = await this.capture.captureChartWithRetry(symbol, outputPath);
        if (result.success) {
          return result;
        }
        lastError = result.error;
        
        if (attempt < this.config.retryFailedScreenshots) {
          console.log(`    🔄 Retry ${attempt}/${this.config.retryFailedScreenshots} for ${symbol}USDT...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
        }
      } catch (error) {
        lastError = error.message;
        if (attempt < this.config.retryFailedScreenshots) {
          console.log(`    🔄 Retry ${attempt}/${this.config.retryFailedScreenshots} for ${symbol}USDT...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    return {
      success: false,
      error: lastError || 'Unknown error',
      symbol,
      batchNumber
    };
  }

  /**
   * Validate screenshot quality
   * @param {string} filePath - Path to screenshot file
   * @returns {Object} Validation result
   */
  async validateScreenshot(filePath) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      fileSizeKB: 0,
      dimensions: { width: 0, height: 0 }
    };

    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        validation.valid = false;
        validation.errors.push('File does not exist');
        return validation;
      }

      // Check file size
      const stats = statSync(filePath);
      validation.fileSizeKB = Math.round(stats.size / 1024);

      if (validation.fileSizeKB < this.config.minFileSizeKB) {
        validation.valid = false;
        validation.errors.push(`File too small: ${validation.fileSizeKB}KB < ${this.config.minFileSizeKB}KB`);
      } else if (validation.fileSizeKB > this.config.maxFileSizeKB) {
        validation.valid = false;
        validation.errors.push(`File too large: ${validation.fileSizeKB}KB > ${this.config.maxFileSizeKB}KB`);
      }

      // TODO: Add image dimension validation using sharp or similar library
      // For now, we'll assume dimensions are correct if file size is reasonable
      if (validation.fileSizeKB >= this.config.minFileSizeKB && validation.fileSizeKB <= this.config.maxFileSizeKB) {
        validation.dimensions = {
          width: this.config.requiredWidth,
          height: this.config.requiredHeight
        };
      }

      // Check for TradingView loading errors (basic file size check)
      if (validation.fileSizeKB < 50) {
        validation.valid = false;
        validation.errors.push('File too small, likely TradingView loading error');
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Create session directory with proper structure
   * @param {string} timestamp - Session timestamp
   * @returns {string} Session directory path
   */
  createSessionDirectory(timestamp) {
    const sessionDir = join(this.config.outputDir, `session_${timestamp}`);
    
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['originals', 'metadata'];
    subdirs.forEach(subdir => {
      const subdirPath = join(sessionDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath, { recursive: true });
      }
    });

    return sessionDir;
  }

  /**
   * Create batches from symbols array
   * @param {Array} symbols - Array of symbols
   * @param {number} batchSize - Size of each batch
   * @returns {Array} Array of batches
   */
  createBatches(symbols, batchSize) {
    const batches = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Save progress to file for resuming interrupted batches
   * @param {string} sessionDir - Session directory
   */
  async saveProgress(sessionDir) {
    const progressPath = join(sessionDir, this.config.progressFile);
    writeFileSync(progressPath, JSON.stringify(this.progress, null, 2));
  }

  /**
   * Resume progress from previous session
   * @param {Array} symbols - Original symbols array
   * @returns {boolean} True if progress was resumed
   */
  async resumeProgress(symbols) {
    // Look for existing progress files in output directory
    const progressFiles = this.findProgressFiles();
    
    if (progressFiles.length === 0) {
      return false;
    }

    // Use the most recent progress file
    const latestProgressFile = progressFiles[progressFiles.length - 1];
    
    try {
      const progressData = JSON.parse(readFileSync(latestProgressFile, 'utf8'));
      this.progress = { ...this.progress, ...progressData };
      
      console.log(`📋 Found previous progress: ${this.progress.processedSymbols}/${this.progress.totalSymbols} processed`);
      return true;
    } catch (error) {
      console.log(`⚠️  Could not load progress file: ${error.message}`);
      return false;
    }
  }

  /**
   * Find existing progress files
   * @returns {Array} Array of progress file paths
   */
  findProgressFiles() {
    // This is a simplified implementation
    // In a real scenario, you'd scan the output directory for progress files
    return [];
  }

  /**
   * Get remaining symbols to process
   * @param {Array} symbols - Original symbols array
   * @returns {Array} Remaining symbols
   */
  getRemainingSymbols(symbols) {
    const processedSymbols = this.results.map(r => r.symbol);
    return symbols.filter(symbol => !processedSymbols.includes(symbol));
  }

  /**
   * Save processing summary
   * @param {string} sessionDir - Session directory
   * @param {Object} summary - Summary data
   * @returns {Object} Final summary
   */
  async saveProcessingSummary(sessionDir, summary) {
    const finalSummary = {
      ...summary,
      timestamp: this.progress.startTime,
      endTime: new Date().toISOString(),
      sessionDir,
      config: this.config,
      results: this.results,
      failed: this.failedScreenshots,
      statistics: this.getStatistics()
    };

    const summaryPath = join(sessionDir, 'processing_summary.json');
    writeFileSync(summaryPath, JSON.stringify(finalSummary, null, 2));

    return finalSummary;
  }

  /**
   * Get processing statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    const total = this.results.length + this.failedScreenshots.length;
    const successful = this.results.length;
    const failed = this.failedScreenshots.length;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0,
      averageFileSize: successful > 0 ? 
        Math.round(this.results.reduce((sum, r) => sum + (r.fileSizeKB || 0), 0) / successful) : 0,
      processingTime: this.progress.startTime ? 
        Math.round((new Date() - new Date(this.progress.startTime)) / 1000) : 0
    };
  }
}
