#!/usr/bin/env node

/**
 * 🚀 BULLETPROOF USDT PAIRS DOWNLOADER (TOP 100)
 * 
 * Downloads top 100 USDT trading pairs from CoinGecko API with:
 * - Rate limiting (respects free API limits)
 * - Single batch download (100 pairs total)
 * - Proper delays between batches
 * - Robust error handling
 * - CSV output for Node.js CLI workflow
 * - No external dependencies
 * - RESPECTS FREE API LIMITS
 * - Node.js CLI focused (no web application)
 * 
 * Usage: node download-usdt-pairs.js [--test] [--max-pages=N] [--resume]
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

// ============================================================================
// CORE TYPES & INTERFACES
// ============================================================================

/**
 * USDT trading pair data structure
 */
class USDTPair {
  constructor(data) {
    this.symbol = data.symbol?.toUpperCase() || '';
    this.name = data.name || '';
    this.price = data.current_price || 0;
    this.marketCap = data.market_cap || 0;
    this.rank = data.market_cap_rank || 0;
    this.volume24h = data.total_volume || 0;
    this.priceChange24h = data.price_change_percentage_24h || 0;
    this.circulatingSupply = data.circulating_supply;
    this.totalSupply = data.total_supply;
    this.maxSupply = data.max_supply;
  }

  /**
   * Convert to CSV row
   */
  toCSVRow() {
    return [
      this.symbol,
      this.name,
      this.price,
      this.marketCap,
      this.rank,
      this.volume24h,
      this.priceChange24h,
      this.circulatingSupply || '',
      this.totalSupply || '',
      this.maxSupply || ''
    ].map(field => `"${field}"`).join(',');
  }

  /**
   * Get CSV header
   */
  static getCSVHeader() {
    return [
      'Symbol',
      'Name', 
      'Price (USD)',
      'Market Cap',
      'Rank',
      '24h Volume',
      '24h Price Change %',
      'Circulating Supply',
      'Total Supply',
      'Max Supply'
    ].map(field => `"${field}"`).join(',');
  }
}

// ============================================================================
// CONFIGURATION - RESPECTING FREE API LIMITS
// ============================================================================

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.coingecko.com/api/v3',
  apiKey: process.env.COINGECKO_API_KEY || 'CG-pE85bxEYTmunUjTjakjotw3N', // Use env var or fallback
  timeoutMs: 30000,
  delayBetweenBatchesMs: 120000, // 2 minutes between batches (respects free limits)
  maxRetries: 3,
  maxPages: 1, // Single page for top 100 pairs only
  perPage: 100, // Top 100 USDT pairs only (reduced from 1000)
  batchStateFile: 'batch-state.json' // For resume functionality
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Delay execution for specified milliseconds
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate number values
 */
const validateNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Validate string values
 */
const validateString = (value) => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Validate raw API response
 */
const validateRawResponse = (data) => {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  
  const firstItem = data[0];
  return (
    typeof firstItem === 'object' &&
    firstItem !== null &&
    validateString(firstItem.symbol) &&
    validateString(firstItem.name) &&
    validateNumber(firstItem.current_price) &&
    validateNumber(firstItem.market_cap)
  );
};

/**
 * Load batch state from file for resume functionality
 */
const loadBatchState = (config) => {
  try {
    if (existsSync(config.batchStateFile)) {
      const stateData = readFileSync(config.batchStateFile, 'utf8');
      const state = JSON.parse(stateData);
      console.log(`📂 Resuming from batch state: ${state.completedBatches} batches completed, ${state.totalCoins} coins collected`);
      return state;
    }
  } catch (error) {
    console.log(`⚠️  Could not load batch state: ${error.message}`);
  }
  return null;
};

/**
 * Save batch state to file for resume functionality
 */
const saveBatchState = (config, state) => {
  try {
    const stateData = JSON.stringify(state, null, 2);
    writeFileSync(config.batchStateFile, stateData, 'utf8');
  } catch (error) {
    console.error(`❌ Error saving batch state: ${error.message}`);
  }
};

/**
 * Clear batch state file
 */
const clearBatchState = (config) => {
  try {
    if (existsSync(config.batchStateFile)) {
      writeFileSync(config.batchStateFile, '', 'utf8');
    }
  } catch (error) {
    console.error(`❌ Error clearing batch state: ${error.message}`);
  }
};

/**
 * Get memory usage information
 */
const getMemoryUsage = () => {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  };
};

// ============================================================================
// CORE API FUNCTIONS - RESPECTING RATE LIMITS
// ============================================================================

/**
 * Fetch a single batch of coins from CoinGecko with API key and retry logic
 * This gets the top 250 coins by market cap - most will have USDT pairs
 */
const fetchCoinsBatch = async (config, page, perPage, retryCount = 0) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);
    
    // Use the API key in the request - get top coins by market cap
    const url = `${config.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&price_change_percentage=24h&x_cg_demo_api_key=${config.apiKey}`;
    
    console.log(`📥 Fetching batch ${page} (${perPage} top coins by market cap)...${retryCount > 0 ? ` (Retry ${retryCount}/${config.maxRetries})` : ''}`);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-CG-Demo-API-Key': config.apiKey,
        'User-Agent': 'Crypto-Strategy-Builder-V5/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ API Error: ${errorMsg}`);
      
      // Handle specific error cases
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please wait before retrying.`);
      } else if (response.status === 401) {
        throw new Error(`Authentication failed. Check your API key.`);
      } else if (response.status >= 500) {
        throw new Error(`Server error. CoinGecko API may be experiencing issues.`);
      }
      
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    if (!validateRawResponse(data)) {
      throw new Error('Invalid API response format - data structure unexpected');
    }
    
    console.log(`✅ Batch ${page}: ${data.length} coins received`);
    return data;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${config.timeoutMs}ms`);
    }
    
    // Retry logic for transient errors
    if (retryCount < config.maxRetries && (
      error.message.includes('timeout') || 
      error.message.includes('Server error') ||
      error.message.includes('ECONNRESET')
    )) {
      const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`⏳ Retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return fetchCoinsBatch(config, page, perPage, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Fetch all coin batches with proper delays, resume functionality, and memory monitoring
 * This approach respects the free API limits by making minimal requests
 */
const fetchAllCoinBatches = async (config = DEFAULT_CONFIG) => {
  try {
    console.log(`🚀 Starting batch download (max ${config.maxPages} batches)...`);
    console.log(`⏰ Will wait ${config.delayBetweenBatchesMs / 1000}s between batches to respect API limits`);
    
    // Try to resume from previous state
    const savedState = loadBatchState(config);
    let allCoins = savedState ? savedState.coins || [] : [];
    let currentPage = savedState ? savedState.lastCompletedPage + 1 : 1;
    let completedBatches = savedState ? savedState.completedBatches || 0 : 0;
    
    // Show initial memory usage
    const initialMemory = getMemoryUsage();
    console.log(`💾 Initial memory usage: ${initialMemory.heapUsed}MB heap, ${initialMemory.rss}MB RSS`);
    
    while (currentPage <= config.maxPages) {
      console.log(`\n🔄 Processing batch ${currentPage}/${config.maxPages} (${completedBatches} completed)...`);
      
      try {
        const batchData = await fetchCoinsBatch(config, currentPage, config.perPage);
        
        // If no more data, we've reached the end
        if (batchData.length === 0) {
          console.log(`🏁 No more data in batch ${currentPage}, stopping`);
          break;
        }
        
        // Add all coins from this batch (most top coins have USDT pairs)
        allCoins.push(...batchData);
        completedBatches++;
        
        // Save progress state
        const batchState = {
          lastCompletedPage: currentPage,
          completedBatches: completedBatches,
          totalCoins: allCoins.length,
          timestamp: new Date().toISOString(),
          coins: allCoins // Save actual data for resume
        };
        saveBatchState(config, batchState);
        
        // Show progress and memory usage
        const currentMemory = getMemoryUsage();
        console.log(`📊 Batch ${currentPage} complete: ${batchData.length} coins received`);
        console.log(`📈 Total coins collected: ${allCoins.length}`);
        console.log(`💾 Memory usage: ${currentMemory.heapUsed}MB heap, ${currentMemory.rss}MB RSS`);
        
        // If we got less than max items, we've reached the end
        if (batchData.length < config.perPage) {
          console.log(`🏁 Partial batch received (${batchData.length}/${config.perPage}), stopping`);
          break;
        }
        
        currentPage++;
        
        // Wait between batches to respect API limits (only if not the last batch)
        if (currentPage <= config.maxPages) {
          console.log(`⏳ Waiting ${config.delayBetweenBatchesMs / 1000}s before next batch...`);
          await delay(config.delayBetweenBatchesMs);
        }
        
      } catch (error) {
        console.error(`❌ Error in batch ${currentPage}: ${error.message}`);
        
        // Save error state for debugging
        const errorState = {
          lastCompletedPage: currentPage - 1,
          completedBatches: completedBatches,
          totalCoins: allCoins.length,
          error: error.message,
          timestamp: new Date().toISOString(),
          coins: allCoins
        };
        saveBatchState(config, errorState);
        
        // Re-throw error to be handled by caller
        throw error;
      }
    }
    
    // Clear batch state on successful completion
    clearBatchState(config);
    
    const finalMemory = getMemoryUsage();
    console.log(`🎉 Batch download complete! Total coins: ${allCoins.length}`);
    console.log(`💾 Final memory usage: ${finalMemory.heapUsed}MB heap, ${finalMemory.rss}MB RSS`);
    console.log(`💡 Note: Most top coins by market cap have USDT trading pairs available`);
    
    return allCoins;
    
  } catch (error) {
    console.error(`❌ Error fetching coin batches: ${error.message}`);
    throw error;
  }
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

/**
 * Main function with proper API limit handling
 */
const main = async () => {
  try {
    console.log('🚀 BULLETPROOF USDT PAIRS DOWNLOADER (TOP 100)');
    console.log('===============================================');
    console.log('🎯 Using CoinGecko API with your API key');
    console.log('📊 Scope: Top 100 USDT pairs only (Node.js CLI)');
    
    // Check if using environment variable or fallback
    const apiKeySource = process.env.COINGECKO_API_KEY ? 'Environment Variable' : 'Fallback';
    const maskedKey = DEFAULT_CONFIG.apiKey.substring(0, 8) + '...' + DEFAULT_CONFIG.apiKey.substring(DEFAULT_CONFIG.apiKey.length - 4);
    console.log(`🔑 API Key: ${maskedKey} (${apiKeySource})`);
    console.log('⚠️  RESPECTING FREE API LIMITS - 2 minute delays between batches');
    console.log('');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isTest = args.includes('--test');
    const maxPagesArg = args.find(arg => arg.startsWith('--max-pages='));
    const resumeArg = args.includes('--resume');
    const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : DEFAULT_CONFIG.maxPages;
    
    if (isTest) {
      console.log('🧪 TEST MODE: Using reduced batch limit');
      DEFAULT_CONFIG.maxPages = Math.min(maxPages, 1);
    } else {
      DEFAULT_CONFIG.maxPages = maxPages;
    }
    
    // Clear batch state if not resuming
    if (!resumeArg) {
      clearBatchState(DEFAULT_CONFIG);
    }
    
    // Validate API key
    if (!DEFAULT_CONFIG.apiKey || DEFAULT_CONFIG.apiKey.length < 10) {
      throw new Error('Invalid API key. Please set COINGECKO_API_KEY environment variable or check the fallback key.');
    }
    
    console.log(`📋 Configuration:`);
    console.log(`   Scope: Top 100 USDT pairs only`);
    console.log(`   Max batches: ${DEFAULT_CONFIG.maxPages}`);
    console.log(`   Coins per batch: ${DEFAULT_CONFIG.perPage}`);
    console.log(`   Delay between batches: ${DEFAULT_CONFIG.delayBetweenBatchesMs / 1000}s`);
    console.log(`   Timeout: ${DEFAULT_CONFIG.timeoutMs}ms`);
    console.log(`   API Key: ${maskedKey} (${apiKeySource})`);
    console.log(`   Resume: ${resumeArg ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    // Fetch all coin batches with proper delays
    const coins = await fetchAllCoinBatches(DEFAULT_CONFIG);
    
    if (coins.length === 0) {
      console.log('⚠️  No coins received. Check API status or configuration.');
      return;
    }
    
    // Filter out stablecoins and USD pairs that won't provide meaningful analysis
    const excludedSymbols = [
      'usdt', 'usdc', 'usd', 'dai', 'busd', 'tusd', 'usdp', 'usdd', 
      'frax', 'lusd', 'susd', 'gusd', 'usds', 'usde', 'usdf', 'usdt0', 'usdtb'
    ];
    
    const filteredCoins = coins.filter(coin => {
      const symbol = coin.symbol?.toLowerCase();
      return symbol && !excludedSymbols.includes(symbol);
    });
    
    console.log(`📊 Filtered out ${coins.length - filteredCoins.length} stablecoin pairs`);
    console.log(`📊 Processing ${filteredCoins.length} non-stablecoin pairs`);
    
    // Transform to USDTPair objects
    const pairs = filteredCoins.map(coin => new USDTPair(coin));
    
    // Generate filename and save to Desktop "Crypto data Download" folder
    const filename = generateFilename();
    const desktopPath = join(homedir(), 'Desktop', 'Crypto data Download');
    const fullPath = join(desktopPath, filename);
    
    saveToCSV(pairs, fullPath);
    
    // Also save to local storage system
    try {
      const { SimpleCryptoStorage } = await import('./src/storage/simple-storage.js');
      const storage = new SimpleCryptoStorage('/Users/jacobuslemmer/Desktop/CLI App testing/crypto-pairs');
      
      const storageResult = await storage.storeRawData(coins, 'coingecko-api');
      if (storageResult.success) {
        console.log(`💾 Data also stored in local storage system`);
        console.log(`📁 Storage files: ${storageResult.filePaths?.length || 0} files created`);
        
        // Show storage statistics
        const statsResult = await storage.getStorageStats();
        if (statsResult.success) {
          console.log(`📊 Storage stats: ${statsResult.data.processed.count} processed files, ${(statsResult.data.processed.totalSize / 1024).toFixed(2)} KB total`);
        }
      } else {
        console.log(`⚠️  Local storage failed: ${storageResult.error}`);
      }
    } catch (error) {
      console.log(`⚠️  Local storage not available: ${error.message}`);
    }
    
    // Summary
    console.log('');
    console.log('📊 DOWNLOAD SUMMARY');
    console.log('==================');
    console.log(`Total coins downloaded: ${pairs.length}`);
    console.log(`Output file: ${filename}`);
    console.log(`Saved to: ${fullPath}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');
    console.log('💡 IMPORTANT: Top 100 coins by market cap have USDT trading pairs');
    console.log('💡 This approach respects API limits while getting focused data for Node.js CLI');
    
    // Sample data
    if (pairs.length > 0) {
      console.log('');
      console.log('🔍 SAMPLE DATA (Top 5 by market cap):');
      pairs
        .filter(pair => pair.marketCap > 0)
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, 5)
        .forEach((pair, index) => {
          console.log(`  ${index + 1}. ${pair.symbol} (${pair.name}) - $${pair.price.toFixed(2)}`);
        });
    }
    
    console.log('');
    console.log('✅ SUCCESS: Coins downloaded and saved to CSV!');
    console.log('📁 File ready for import into Google Sheets or other tools.');
    console.log(`📍 Location: ${fullPath}`);
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('   - Use CLI commands for chart screenshots');
    console.log('   - Run anonymization pipeline');
    console.log('   - Execute AI analysis workflow');
    console.log('   - Build trading strategies via CLI');
    
  } catch (error) {
    console.error('');
    console.error('❌ CRITICAL ERROR');
    console.error('==================');
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   - Check internet connection');
    console.error('   - Verify CoinGecko API status');
    console.error('   - Ensure Node.js version >= 18');
    console.error('   - Check file permissions for Desktop folder');
    console.error('   - Verify API key is valid');
    console.error('   - Check if you hit API rate limits');
    process.exit(1);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Save pairs to CSV file
 */
const saveToCSV = (pairs, filename) => {
  try {
    // Ensure output directory exists
    const outputDir = dirname(filename);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate CSV content
    const csvHeader = USDTPair.getCSVHeader();
    const csvRows = pairs.map(pair => pair.toCSVRow());
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Write to file
    writeFileSync(filename, csvContent, 'utf8');
    console.log(`💾 CSV saved: ${filename}`);
    console.log(`📊 File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error(`❌ Error saving CSV: ${error.message}`);
    throw error;
  }
};

/**
 * Generate filename with timestamp
 */
const generateFilename = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `usdt-trading-pairs_${timestamp}.csv`;
};

// ============================================================================
// EXECUTION
// ============================================================================

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  USDTPair,
  fetchAllCoinBatches,
  saveToCSV,
  generateFilename,
  DEFAULT_CONFIG
};
