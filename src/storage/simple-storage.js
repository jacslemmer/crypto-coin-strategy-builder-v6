/**
 * Simple Storage System for Crypto Data
 * 
 * A JavaScript implementation of the local file storage system
 * for cryptocurrency market data without TypeScript dependencies.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Simple storage class for crypto pairs data
 */
export class SimpleCryptoStorage {
  constructor(baseDir = './data/crypto-pairs') {
    this.baseDir = baseDir;
    this.rawDir = join(baseDir, 'raw');
    this.processedDir = join(baseDir, 'processed');
    this.metadataDir = join(baseDir, 'metadata');
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  initializeStorage() {
    const dirs = [this.baseDir, this.rawDir, this.processedDir, this.metadataDir];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate timestamp for file naming
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  /**
   * Store raw crypto data
   */
  async storeRawData(data, source = 'coingecko-api') {
    try {
      const timestamp = this.generateTimestamp();
      
      // Store raw data
      const rawFilename = `coingecko_batch_001_${timestamp}.json`;
      const rawPath = join(this.rawDir, rawFilename);
      
      const rawData = {
        metadata: {
          timestamp,
          source,
          totalPairs: data.length,
          fileSize: 0
        },
        data: data
      };

      const rawContent = JSON.stringify(rawData, null, 2);
      writeFileSync(rawPath, rawContent, 'utf8');

      // Store processed JSON
      const jsonFilename = `crypto_pairs_${timestamp}.json`;
      const jsonPath = join(this.processedDir, jsonFilename);
      writeFileSync(jsonPath, rawContent, 'utf8');

      // Store processed CSV
      const csvFilename = `crypto_pairs_${timestamp}.csv`;
      const csvPath = join(this.processedDir, csvFilename);
      
      const csvContent = this.generateCSV(data);
      writeFileSync(csvPath, csvContent, 'utf8');

      // Store metadata
      const metadataFilename = `metadata_${timestamp}.json`;
      const metadataPath = join(this.metadataDir, metadataFilename);
      
      const metadata = {
        timestamp,
        source,
        totalPairs: data.length,
        files: {
          raw: rawPath,
          json: jsonPath,
          csv: csvPath
        },
        fileSizes: {
          raw: rawContent.length,
          json: rawContent.length,
          csv: csvContent.length
        }
      };

      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      return {
        success: true,
        message: `Successfully stored ${data.length} crypto pairs`,
        filePaths: [rawPath, jsonPath, csvPath, metadataPath],
        metadata
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to store data',
        error: error.message
      };
    }
  }

  /**
   * Generate CSV content from crypto data
   */
  generateCSV(data) {
    const headers = [
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
    ];

    const rows = data.map(coin => [
      `"${coin.symbol || ''}"`,
      `"${coin.name || ''}"`,
      coin.current_price || 0,
      coin.market_cap || 0,
      coin.market_cap_rank || 0,
      coin.total_volume || 0,
      coin.price_change_percentage_24h || 0,
      coin.circulating_supply || '',
      coin.total_supply || '',
      coin.max_supply || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get latest data
   */
  async getLatestData() {
    try {
      if (!existsSync(this.processedDir)) {
        return {
          success: false,
          message: 'No processed data directory found',
          error: 'Processed directory does not exist'
        };
      }

      const files = readdirSync(this.processedDir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = join(this.processedDir, f);
          const stats = statSync(filePath);
          return { filename: f, filePath, modified: stats.mtime };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

      if (files.length === 0) {
        return {
          success: false,
          message: 'No processed data files found',
          error: 'No JSON files in processed directory'
        };
      }

      const latestFile = files[0];
      const content = readFileSync(latestFile.filePath, 'utf8');
      const data = JSON.parse(content);

      return {
        success: true,
        message: `Retrieved latest data with ${data.data.length} crypto pairs`,
        data: data,
        filePath: latestFile.filePath
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve latest data',
        error: error.message
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const stats = {
        raw: { count: 0, totalSize: 0 },
        processed: { count: 0, totalSize: 0 },
        metadata: { count: 0, totalSize: 0 }
      };

      // Count files in each directory
      const dirs = [
        { name: 'raw', path: this.rawDir },
        { name: 'processed', path: this.processedDir },
        { name: 'metadata', path: this.metadataDir }
      ];

      for (const dir of dirs) {
        if (existsSync(dir.path)) {
          const files = readdirSync(dir.path);
          stats[dir.name] = {
            count: files.length,
            totalSize: files.reduce((sum, file) => {
              const filePath = join(dir.path, file);
              const fileStats = statSync(filePath);
              return sum + fileStats.size;
            }, 0)
          };
        }
      }

      return {
        success: true,
        message: 'Storage statistics retrieved',
        data: {
          ...stats,
          timestamp: this.generateTimestamp()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to get storage statistics',
        error: error.message
      };
    }
  }

  /**
   * Search by symbol
   */
  async searchBySymbol(symbol) {
    try {
      const latestResult = await this.getLatestData();
      if (!latestResult.success) {
        return latestResult;
      }

      const data = latestResult.data.data;
      const filteredData = data.filter(coin => 
        coin.symbol && coin.symbol.toLowerCase().includes(symbol.toLowerCase())
      );

      return {
        success: true,
        message: `Found ${filteredData.length} pairs matching symbol "${symbol}"`,
        data: {
          searchTerm: symbol,
          results: filteredData,
          total: filteredData.length
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to search by symbol',
        error: error.message
      };
    }
  }
}




