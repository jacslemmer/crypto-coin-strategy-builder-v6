#!/usr/bin/env node

/**
 * Test Batch Screenshot Processing
 * 
 * Tests the batch screenshot functionality with top 3 symbols
 */

import { BatchScreenshotProcessor } from './src/screenshot/batch-screenshot.js';

// Test with top 3 symbols only (excluding stablecoins)
const testSymbols = ['BTC', 'ETH', 'XRP'];

async function testBatchScreenshot() {
  console.log('🧪 Testing Batch Screenshot Processing');
  console.log('=====================================');
  console.log(`🎯 Testing with symbols: ${testSymbols.join(', ')}`);

  const processor = new BatchScreenshotProcessor({
    batchSize: 2, // Small batch for testing
    delayBetweenScreenshots: 20000, // 20 seconds for testing
    delayBetweenBatches: 30000 // 30 seconds for testing
  });

  try {
    // Process test symbols
    const result = await processor.processScreenshots(testSymbols);
    
    if (result.success) {
      console.log('\n✅ Batch processing completed successfully!');
    } else {
      console.log('\n⚠️  Batch processing completed with some failures');
    }

    // Show statistics
    const stats = processor.getStatistics();
    console.log('\n📊 Processing Statistics:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Average File Size: ${stats.averageFileSize} KB`);

    // Show failed screenshots
    if (result.failed && result.failed.length > 0) {
      console.log('\n❌ Failed Screenshots:');
      result.failed.forEach(failed => {
        console.log(`   ${failed.symbol}: ${failed.error}`);
      });
    }

    // Show successful screenshots
    if (result.results && result.results.length > 0) {
      console.log('\n✅ Successful Screenshots:');
      result.results.forEach(success => {
        console.log(`   ${success.symbol}: ${success.fileSizeKB} KB`);
      });
    }

  } catch (error) {
    console.error('❌ Batch test failed:', error.message);
  }
}

// Run test
testBatchScreenshot();
