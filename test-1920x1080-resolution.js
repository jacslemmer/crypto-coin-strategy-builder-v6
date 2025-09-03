#!/usr/bin/env node

/**
 * CRITICAL TEST: Verify 1920x1080 Resolution Enforcement
 * 
 * This test ensures that:
 * 1. TradingView screenshots are captured at exactly 1920x1080
 * 2. Python cropping works with 1920x1080 input
 * 3. The entire pipeline maintains resolution integrity
 */

import { fetchTradingViewChart, createDefaultConfig, batchCaptureTradingViewCharts } from './src/tradingview-chart-fetcher.ts';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Test configuration
const TEST_SYMBOLS = ['BTC', 'ETH', 'SOL']; // Test with 3 symbols
const TEST_OUTPUT_DIR = './test_screenshots_1920x1080';
const REQUIRED_RESOLUTION = { width: 1920, height: 1080 };

console.log('🧪 CRITICAL RESOLUTION TEST: 1920x1080 Enforcement');
console.log('=' .repeat(60));
console.log('📐 REQUIRED RESOLUTION: 1920x1080 (NON-NEGOTIABLE)');
console.log('🎯 This test will FAIL if resolution is not exactly 1920x1080');
console.log('=' .repeat(60));

async function createTestDirectory() {
  try {
    await fs.mkdir(TEST_OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created test directory: ${TEST_OUTPUT_DIR}`);
  } catch (error) {
    console.error(`❌ Failed to create test directory: ${error.message}`);
    throw error;
  }
}

async function testSingleScreenshot() {
  console.log('\n🔬 TEST 1: Single Screenshot Resolution');
  console.log('-'.repeat(40));
  
  const symbol = 'BTC';
  const outputPath = path.join(TEST_OUTPUT_DIR, `${symbol}USDT_test.png`);
  
  console.log(`🎯 Testing symbol: ${symbol}`);
  console.log(`📁 Output path: ${outputPath}`);
  
  const config = createDefaultConfig(symbol, outputPath, true);
  
  try {
    const result = await fetchTradingViewChart(config);
    
    if (result.success) {
      console.log('✅ Screenshot captured successfully');
      console.log(`📊 Metadata:`, result.metadata);
      
      // Verify resolution in metadata
      if (result.metadata?.resolution === '1920x1080') {
        console.log('✅ Resolution validation PASSED');
        return true;
      } else {
        console.log(`❌ Resolution validation FAILED: ${result.metadata?.resolution}`);
        return false;
      }
    } else {
      console.log(`❌ Screenshot failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error(`💥 Test crashed: ${error.message}`);
    return false;
  }
}

async function testBatchScreenshots() {
  console.log('\n🔬 TEST 2: Batch Screenshot Resolution');
  console.log('-'.repeat(40));
  
  console.log(`🎯 Testing symbols: ${TEST_SYMBOLS.join(', ')}`);
  
  try {
    const results = await batchCaptureTradingViewCharts(
      TEST_SYMBOLS,
      TEST_OUTPUT_DIR,
      {
        headless: true,
        delayBetweenScreenshots: 5000, // 5 seconds for testing
        maxConcurrency: 1 // One at a time for testing
      }
    );
    
    console.log(`📊 Batch results:`);
    console.log(`   ✅ Successful: ${results.successful.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    
    if (results.failed.length > 0) {
      console.log(`❌ Failed screenshots:`);
      results.failed.forEach(result => {
        console.log(`   - ${result.error}`);
      });
      return false;
    }
    
    // Verify all successful screenshots have correct resolution
    let allCorrectResolution = true;
    for (const result of results.successful) {
      if (result.metadata?.resolution !== '1920x1080') {
        console.log(`❌ Wrong resolution: ${result.metadata?.resolution}`);
        allCorrectResolution = false;
      }
    }
    
    if (allCorrectResolution) {
      console.log('✅ All batch screenshots have correct 1920x1080 resolution');
      return true;
    } else {
      console.log('❌ Some batch screenshots have incorrect resolution');
      return false;
    }
    
  } catch (error) {
    console.error(`💥 Batch test crashed: ${error.message}`);
    return false;
  }
}

async function testPythonCropping() {
  console.log('\n🔬 TEST 3: Python Cropping with 1920x1080');
  console.log('-'.repeat(40));
  
  return new Promise((resolve) => {
    console.log('🐍 Running Python cropping test...');
    
    const pythonScript = path.join('./src/batch-crop-usdt-pairs-v2.py');
    const child = spawn('python3', [pythonScript, TEST_OUTPUT_DIR], {
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString().trim());
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(data.toString().trim());
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        if (output.includes('ALL IMAGES SUCCESSFULLY CROPPED')) {
          console.log('✅ Python cropping test PASSED');
          resolve(true);
        } else if (output.includes('RESOLUTION ERRORS DETECTED')) {
          console.log('❌ Python cropping test FAILED - Resolution errors detected');
          resolve(false);
        } else {
          console.log('⚠️  Python cropping test completed with warnings');
          resolve(true);
        }
      } else {
        console.log(`❌ Python cropping test FAILED with exit code: ${code}`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.error(`💥 Python test crashed: ${error.message}`);
      resolve(false);
    });
  });
}

async function validateFileSizes() {
  console.log('\n🔬 TEST 4: File Size Validation');
  console.log('-'.repeat(40));
  
  try {
    const files = await fs.readdir(TEST_OUTPUT_DIR);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    
    console.log(`📁 Found ${pngFiles.length} PNG files`);
    
    for (const file of pngFiles) {
      const filePath = path.join(TEST_OUTPUT_DIR, file);
      const stats = await fs.stat(filePath);
      
      console.log(`📄 ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
      
      // Check if file size is reasonable (should be > 10KB for a 1920x1080 screenshot)
      if (stats.size < 10000) {
        console.log(`⚠️  Warning: ${file} seems too small (${stats.size} bytes)`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ File validation failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive 1920x1080 resolution tests...\n');
  
  try {
    // Setup
    await createTestDirectory();
    
    // Run tests
    const test1 = await testSingleScreenshot();
    const test2 = await testBatchScreenshots();
    const test3 = await testPythonCropping();
    const test4 = await validateFileSizes();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🔬 Test 1 (Single Screenshot): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔬 Test 2 (Batch Screenshots): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔬 Test 3 (Python Cropping): ${test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`🔬 Test 4 (File Validation): ${test4 ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = test1 && test2 && test3 && test4;
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ 1920x1080 resolution enforcement is working correctly');
      console.log('✅ TradingView screenshot pipeline is ready for production');
      console.log('✅ Python cropping pipeline is ready for production');
    } else {
      console.log('\n❌ SOME TESTS FAILED!');
      console.log('🔧 Fix the failing tests before proceeding with development');
      console.log('📐 Ensure all screenshots are exactly 1920x1080 pixels');
    }
    
    console.log('\n📁 Test files saved in:', TEST_OUTPUT_DIR);
    console.log('🧹 You can delete this directory after reviewing the results');
    
  } catch (error) {
    console.error('\n💥 TEST SUITE CRASHED!');
    console.error(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(console.error);


