#!/usr/bin/env node

/**
 * Test TradingView Screenshot System
 * 
 * Tests the screenshot capture functionality with a few sample symbols
 */

import { TradingViewCapture } from './src/screenshot/tradingview-capture.js';
import { BatchScreenshotProcessor } from './src/screenshot/batch-screenshot.js';
import { generateTradingViewUrl, generateTradingViewUrls } from './src/screenshot/url-generator.js';

// Test symbols (top 5 for testing, excluding stablecoins)
const testSymbols = ['BTC', 'ETH', 'XRP', 'BNB', 'SOL'];

async function testSingleScreenshot() {
  console.log('🧪 Testing Single Screenshot Capture');
  console.log('=====================================');

  const capture = new TradingViewCapture();
  
  try {
    // Initialize browser
    const initSuccess = await capture.initialize();
    if (!initSuccess) {
      console.log('❌ Failed to initialize browser');
      return;
    }

    // Test URL generation
    console.log('\n📋 Testing URL Generation:');
    testSymbols.forEach(symbol => {
      const url = generateTradingViewUrl(symbol);
      console.log(`  ${symbol}USDT: ${url}`);
    });

    // Test single screenshot
    console.log('\n📸 Testing Single Screenshot:');
    const outputPath = '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots/test_BTCUSDT.png';
    const result = await capture.captureChart('BTC', outputPath);
    
    if (result.success) {
      console.log(`✅ Screenshot captured successfully!`);
      console.log(`   File: ${result.outputPath}`);
      console.log(`   Size: ${result.fileSizeKB} KB`);
    } else {
      console.log(`❌ Screenshot failed: ${result.error}`);
    }

    // Close browser
    await capture.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await capture.close();
  }
}

async function testBatchScreenshot() {
  console.log('\n🧪 Testing Batch Screenshot Processing');
  console.log('=======================================');

  const processor = new BatchScreenshotProcessor({
    batchSize: 2, // Small batch for testing
    delayBetweenScreenshots: 5000, // 5 seconds for testing
    delayBetweenBatches: 10000 // 10 seconds for testing
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

  } catch (error) {
    console.error('❌ Batch test failed:', error.message);
  }
}

async function testUrlGeneration() {
  console.log('\n🧪 Testing URL Generation');
  console.log('==========================');

  // Test single URL generation
  console.log('📋 Single URL Generation:');
  testSymbols.forEach(symbol => {
    const url = generateTradingViewUrl(symbol);
    console.log(`  ${symbol}USDT: ${url}`);
  });

  // Test batch URL generation
  console.log('\n📋 Batch URL Generation:');
  const urls = generateTradingViewUrls(testSymbols);
  urls.forEach(item => {
    console.log(`  ${item.symbol} -> ${item.pair}: ${item.url}`);
  });
}

async function runAllTests() {
  console.log('🚀 TradingView Screenshot System Tests');
  console.log('======================================');
  console.log(`🎯 Testing with symbols: ${testSymbols.join(', ')}`);
  console.log(`📁 Output directory: /Users/jacobuslemmer/Desktop/CLI App testing/screenshots`);

  try {
    // Test URL generation first
    await testUrlGeneration();
    
    // Test single screenshot
    await testSingleScreenshot();
    
    // Test batch processing
    await testBatchScreenshot();

    console.log('\n🎉 All tests completed!');
    console.log('📁 Check the screenshots directory for captured images');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests
runAllTests();
