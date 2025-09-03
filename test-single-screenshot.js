#!/usr/bin/env node

/**
 * Test Single Screenshot Capture
 * 
 * Tests the screenshot capture functionality with just BTC to debug issues
 */

import { TradingViewCapture } from './src/screenshot/tradingview-capture.js';

async function testSingleScreenshot() {
  console.log('🧪 Testing Single Screenshot Capture (BTC only)');
  console.log('===============================================');

  const capture = new TradingViewCapture();
  
  try {
    // Initialize browser
    console.log('🚀 Initializing browser...');
    const initSuccess = await capture.initialize();
    if (!initSuccess) {
      console.log('❌ Failed to initialize browser');
      return;
    }

    // Test single screenshot
    console.log('\n📸 Testing BTC Screenshot:');
    const outputPath = '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots/test_BTCUSDT_single.png';
    const result = await capture.captureChart('BTC', outputPath);
    
    if (result.success) {
      console.log(`\n✅ Screenshot captured successfully!`);
      console.log(`   File: ${result.outputPath}`);
      console.log(`   Size: ${result.fileSizeKB} KB`);
      console.log(`   URL: ${result.url}`);
    } else {
      console.log(`\n❌ Screenshot failed: ${result.error}`);
    }

    // Close browser
    await capture.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    await capture.close();
  }
}

// Run test
testSingleScreenshot();




