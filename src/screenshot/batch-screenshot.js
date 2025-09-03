/**
 * Batch Screenshot Processor
 * 
 * Processes multiple TradingView chart screenshots in batches
 */

import { TradingViewCapture } from './tradingview-capture.js';
import { generateTradingViewUrls } from './url-generator.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Batch Screenshot Processor Class
 */
export class BatchScreenshotProcessor {
  constructor(config = {}) {
    this.config = {
      batchSize: 5, // Reduced batch size
      delayBetweenScreenshots: 15000, // 15 seconds between screenshots
      delayBetweenBatches: 60000, // 60 seconds between batches
      maxConcurrentBrowsers: 1, // Only one browser at a time
      outputDir: '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots',
      ...config
    };
    
    this.capture = null;
    this.results = [];
    this.failedScreenshots = [];
  }

  /**
   * Process screenshots for multiple cryptocurrency pairs
   * @param {Array} symbols - Array of cryptocurrency symbols
   * @returns {Object} Processing results
   */
  async processScreenshots(symbols) {
    console.log('🚀 Starting batch screenshot processing...');
    console.log(`📊 Processing ${symbols.length} cryptocurrency pairs`);
    console.log(`⚙️  Batch size: ${this.config.batchSize}`);
    console.log(`⏱️  Delay between screenshots: ${this.config.delayBetweenScreenshots / 1000}s`);
    console.log(`📁 Output directory: ${this.config.outputDir}`);

    // Initialize capture
    this.capture = new TradingViewCapture({
      outputDir: this.config.outputDir
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

    // Create output directory with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sessionDir = join(this.config.outputDir, `session_${timestamp}`);
    
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Process symbols in batches
    const batches = this.createBatches(symbols, this.config.batchSize);
    let totalProcessed = 0;
    let totalFailed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} symbols)`);

      const batchResults = await this.processBatch(batch, sessionDir, batchIndex + 1);
      
      // Update counters
      totalProcessed += batchResults.successful;
      totalFailed += batchResults.failed;

      // Add delay between batches (except for last batch)
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${this.config.delayBetweenBatches / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
      }
    }

    // Close browser
    await this.capture.close();

    // Save processing results
    const summary = {
      timestamp,
      totalSymbols: symbols.length,
      totalProcessed,
      totalFailed,
      successRate: ((totalProcessed / symbols.length) * 100).toFixed(2),
      sessionDir,
      results: this.results,
      failed: this.failedScreenshots
    };

    const summaryPath = join(sessionDir, 'processing_summary.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\n🎉 Batch processing complete!');
    console.log(`✅ Successfully processed: ${totalProcessed}/${symbols.length} (${summary.successRate}%)`);
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
   * Process a single batch of symbols
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
      const outputPath = join(sessionDir, `${symbol}USDT_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`);

      console.log(`  📸 [${i + 1}/${batch.length}] Capturing ${symbol}USDT...`);

      // For each screenshot, restart browser to avoid rate limiting
      if (i > 0) {
        console.log(`    🔄 Restarting browser to avoid rate limiting...`);
        await this.capture.close();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const initSuccess = await this.capture.initialize();
        if (!initSuccess) {
          console.log(`    ❌ Failed to restart browser for ${symbol}USDT`);
          batchResults.failed++;
          this.failedScreenshots.push({
            symbol,
            error: 'Failed to restart browser',
            attempt: batchNumber
          });
          continue;
        }
      }

      const result = await this.capture.captureChartWithRetry(symbol, outputPath);
      
      if (result.success) {
        batchResults.successful++;
        this.results.push(result);
        console.log(`    ✅ ${symbol}USDT captured successfully`);
      } else {
        batchResults.failed++;
        this.failedScreenshots.push({
          symbol,
          error: result.error,
          attempt: batchNumber
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
        Math.round(this.results.reduce((sum, r) => sum + (r.fileSizeKB || 0), 0) / successful) : 0
    };
  }
}
