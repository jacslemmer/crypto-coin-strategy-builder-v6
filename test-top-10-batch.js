#!/usr/bin/env node

/**
 * Test Top 10 Crypto Pairs Batch Download
 * 
 * Tests downloading the top 10 USDT pairs in one batch with proper rate limiting
 */

import { BatchScreenshotProcessor } from './src/screenshot/batch-screenshot.js';

// Top 10 crypto symbols by market cap (excluding stablecoins)
const top10Symbols = ['BTC', 'ETH', 'XRP', 'BNB', 'SOL', 'STETH', 'DOGE', 'TRX', 'ADA', 'WSTETH'];

async function testTop10Batch() {
  console.log('🚀 Testing Top 10 Crypto Pairs Batch Download');
  console.log('=============================================');
  console.log(`🎯 Downloading: ${top10Symbols.join(', ')}`);
  console.log(`📊 Total pairs: ${top10Symbols.length}`);

  const processor = new BatchScreenshotProcessor({
    batchSize: 10, // Process all 10 in one batch
    delayBetweenScreenshots: 25000, // 25 seconds between screenshots (very conservative)
    delayBetweenBatches: 0, // No delay since we're doing one batch
    outputDir: '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots'
  });

  try {
    console.log('\n⏰ Starting batch download...');
    console.log('⚠️  This will take approximately 4-5 minutes due to rate limiting');
    
    const startTime = Date.now();
    const result = await processor.processScreenshots(top10Symbols);
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`\n⏱️  Total time: ${duration} seconds (${Math.round(duration / 60)} minutes)`);
    
    if (result.success) {
      console.log('\n🎉 All 10 pairs downloaded successfully!');
    } else {
      console.log('\n⚠️  Batch completed with some failures');
    }

    // Show detailed statistics
    const stats = processor.getStatistics();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total pairs: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Average File Size: ${stats.averageFileSize} KB`);

    // Show successful downloads
    if (result.results && result.results.length > 0) {
      console.log('\n✅ Successfully Downloaded:');
      result.results.forEach((success, index) => {
        console.log(`   ${index + 1}. ${success.symbol}USDT - ${success.fileSizeKB} KB`);
      });
    }

    // Show failed downloads
    if (result.failed && result.failed.length > 0) {
      console.log('\n❌ Failed Downloads:');
      result.failed.forEach((failed, index) => {
        console.log(`   ${index + 1}. ${failed.symbol}USDT - ${failed.error}`);
      });
    }

    // Show session directory
    if (result.summary && result.summary.sessionDir) {
      console.log(`\n📁 All files saved to: ${result.summary.sessionDir}`);
    }

  } catch (error) {
    console.error('\n❌ Batch download failed:', error.message);
  }
}

// Run the test
testTop10Batch();
