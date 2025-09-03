#!/usr/bin/env node

/**
 * Convert JSON crypto data to readable table format
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the latest JSON file
const jsonFilePath = '/Users/jacobuslemmer/Desktop/CLI App testing/crypto-pairs/processed/crypto_pairs_2025-09-01T12-17-42.json';

try {
  console.log('📖 Reading JSON data...');
  const jsonData = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
  
  console.log(`📊 Found ${jsonData.data.length} crypto pairs`);
  
  // Create table header
  let tableContent = '';
  tableContent += '='.repeat(120) + '\n';
  tableContent += 'TOP 100 USDT TRADING PAIRS - CRYPTOCURRENCY MARKET DATA\n';
  tableContent += '='.repeat(120) + '\n';
  tableContent += `Generated: ${jsonData.metadata.timestamp}\n`;
  tableContent += `Source: ${jsonData.metadata.source}\n`;
  tableContent += `Total Pairs: ${jsonData.metadata.totalPairs}\n`;
  tableContent += '='.repeat(120) + '\n\n';
  
  // Table headers
  tableContent += 'Rank'.padEnd(6) + 'Symbol'.padEnd(8) + 'Name'.padEnd(20) + 'Price (USD)'.padEnd(15) + 'Market Cap'.padEnd(20) + '24h Change%'.padEnd(12) + 'Volume 24h'.padEnd(15) + '\n';
  tableContent += '-'.repeat(120) + '\n';
  
  // Add each crypto pair as a table row
  jsonData.data.forEach((coin, index) => {
    const rank = coin.market_cap_rank || (index + 1);
    const symbol = coin.symbol.toUpperCase();
    const name = coin.name.length > 18 ? coin.name.substring(0, 18) + '...' : coin.name;
    const price = coin.current_price ? `$${coin.current_price.toLocaleString()}` : 'N/A';
    const marketCap = coin.market_cap ? `$${(coin.market_cap / 1000000000).toFixed(2)}B` : 'N/A';
    const change24h = coin.price_change_percentage_24h ? `${coin.price_change_percentage_24h.toFixed(2)}%` : 'N/A';
    const volume24h = coin.total_volume ? `$${(coin.total_volume / 1000000000).toFixed(2)}B` : 'N/A';
    
    tableContent += rank.toString().padEnd(6) + 
                   symbol.padEnd(8) + 
                   name.padEnd(20) + 
                   price.padEnd(15) + 
                   marketCap.padEnd(20) + 
                   change24h.padEnd(12) + 
                   volume24h.padEnd(15) + '\n';
  });
  
  tableContent += '\n' + '='.repeat(120) + '\n';
  tableContent += 'END OF DATA\n';
  tableContent += '='.repeat(120) + '\n';
  
  // Save to file
  const outputPath = '/Users/jacobuslemmer/Desktop/CLI App testing/crypto-pairs/processed/crypto_pairs_table.txt';
  writeFileSync(outputPath, tableContent, 'utf8');
  
  console.log('✅ Table conversion complete!');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📊 Converted ${jsonData.data.length} crypto pairs to table format`);
  
  // Show preview of the table
  console.log('\n📋 TABLE PREVIEW (First 10 rows):');
  console.log('-'.repeat(120));
  const lines = tableContent.split('\n');
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    console.log(lines[i]);
  }
  console.log('...\n');
  
} catch (error) {
  console.error('❌ Error converting JSON to table:', error.message);
}




