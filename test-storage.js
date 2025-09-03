#!/usr/bin/env node

/**
 * Test script for Crypto Pairs Storage System
 * 
 * Tests the local file storage functionality for crypto data
 */

import { SimpleCryptoStorage } from './src/storage/simple-storage.js';

// Sample crypto data for testing
const sampleCryptoData = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    current_price: 50000,
    market_cap: 1000000000000,
    market_cap_rank: 1,
    total_volume: 20000000000,
    price_change_percentage_24h: 2.5,
    circulating_supply: 19000000,
    total_supply: 21000000,
    max_supply: 21000000
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    current_price: 3000,
    market_cap: 360000000000,
    market_cap_rank: 2,
    total_volume: 15000000000,
    price_change_percentage_24h: -1.2,
    circulating_supply: 120000000,
    total_supply: null,
    max_supply: null
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    current_price: 1.00,
    market_cap: 80000000000,
    market_cap_rank: 3,
    total_volume: 50000000000,
    price_change_percentage_24h: 0.01,
    circulating_supply: 80000000000,
    total_supply: 80000000000,
    max_supply: null
  }
];

async function testStorageSystem() {
  console.log('🧪 Testing Crypto Pairs Storage System');
  console.log('=====================================');

  try {
    // Initialize storage - using your desktop folder
    const storage = new SimpleCryptoStorage('/Users/jacobuslemmer/Desktop/CLI App testing/crypto-pairs');

    console.log('✅ Storage initialized');

    // Test 1: Store raw data
    console.log('\n📝 Test 1: Storing raw data...');
    const storeResult = await storage.storeRawData(sampleCryptoData, 'test-api');
    
    if (storeResult.success) {
      console.log(`✅ ${storeResult.message}`);
      console.log(`📁 Files created: ${storeResult.filePaths?.length || 0}`);
    } else {
      console.log(`❌ ${storeResult.message}: ${storeResult.error}`);
      return;
    }

    // Test 2: Retrieve latest data
    console.log('\n📖 Test 2: Retrieving latest data...');
    const latestResult = await storage.getLatestData();
    
    if (latestResult.success) {
      console.log(`✅ ${latestResult.message}`);
      console.log(`📊 Data contains ${latestResult.data.data.length} crypto pairs`);
    } else {
      console.log(`❌ ${latestResult.message}: ${latestResult.error}`);
    }

    // Test 3: Search by symbol
    console.log('\n🔍 Test 3: Searching by symbol...');
    const searchResult = await storage.searchBySymbol('BTC');
    
    if (searchResult.success) {
      console.log(`✅ ${searchResult.message}`);
      console.log(`🔍 Found ${searchResult.data.total} matching pairs`);
    } else {
      console.log(`❌ ${searchResult.message}: ${searchResult.error}`);
    }

    // Test 4: Get storage statistics
    console.log('\n📊 Test 4: Getting storage statistics...');
    const statsResult = await storage.getStorageStats();
    
    if (statsResult.success) {
      console.log(`✅ ${statsResult.message}`);
      console.log('📈 Storage Statistics:');
      console.log(`   Raw files: ${statsResult.data.raw.count} (${(statsResult.data.raw.totalSize / 1024).toFixed(2)} KB)`);
      console.log(`   Processed files: ${statsResult.data.processed.count} (${(statsResult.data.processed.totalSize / 1024).toFixed(2)} KB)`);
      console.log(`   Metadata files: ${statsResult.data.metadata.count} (${(statsResult.data.metadata.totalSize / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`❌ ${statsResult.message}: ${statsResult.error}`);
    }

    // Test 5: Show sample data
    console.log('\n📤 Test 5: Sample data preview...');
    console.log('📊 Sample crypto data stored:');
    sampleCryptoData.forEach((coin, index) => {
      console.log(`   ${index + 1}. ${coin.symbol} (${coin.name}) - $${coin.current_price}`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('📁 Check the Desktop/CLI App testing/crypto-pairs directory for created files');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run tests
testStorageSystem();
