/**
 * Crypto Pairs Storage System
 * 
 * Main storage interface for cryptocurrency market data with local file storage.
 * Provides high-level operations for managing crypto pairs data with proper
 * organization, validation, and versioning.
 */

import { join, dirname, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { 
  writeCryptoPairsToJson, 
  writeCryptoPairsToCsv, 
  readCryptoPairsFromJson, 
  readCryptoPairsFromCsv,
  listFilesInDirectory,
  deleteFile,
  archiveFile,
  ensureDirectoryExists,
  FileOperationResult,
  FileMetadata
} from './file-operations.js';
import { generateTimestamp, generateBatchId, isWithinDays } from '../utils/timestamp-utils.js';
import { validateCryptoPairs, CryptoPair } from '../validation/data-validator.js';

/**
 * Storage configuration interface
 */
export interface StorageConfig {
  baseDir: string;
  rawDir: string;
  processedDir: string;
  metadataDir: string;
  archiveDir: string;
  maxFileAge: number; // days
  maxFiles: number;
}

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  baseDir: './data/crypto-pairs',
  rawDir: 'raw',
  processedDir: 'processed',
  metadataDir: 'metadata',
  archiveDir: 'archive',
  maxFileAge: 30, // 30 days
  maxFiles: 100
};

/**
 * Storage operation result interface
 */
export interface StorageResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  filePaths?: string[];
}

/**
 * Crypto Pairs Storage Class
 */
export class CryptoPairsStorage {
  private config: StorageConfig;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this.initializeStorage();
  }

  /**
   * Initialize storage directories
   */
  private initializeStorage(): void {
    const dirs = [
      this.config.baseDir,
      join(this.config.baseDir, this.config.rawDir),
      join(this.config.baseDir, this.config.processedDir),
      join(this.config.baseDir, this.config.metadataDir),
      join(this.config.baseDir, this.config.archiveDir)
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Store raw crypto pairs data from API
   */
  async storeRawData(data: any[], source: string = 'coingecko-api'): Promise<StorageResult> {
    try {
      const timestamp = generateTimestamp();
      const batchId = generateBatchId(1); // For now, always batch 1
      const filename = `coingecko_${batchId}_${timestamp}.json`;

      // Store raw data
      const rawResult = writeCryptoPairsToJson(
        data, 
        this.config.baseDir, 
        this.config.rawDir, 
        filename
      );

      if (!rawResult.success) {
        return {
          success: false,
          message: 'Failed to store raw data',
          error: rawResult.error
        };
      }

      // Store processed data (JSON and CSV)
      const jsonResult = writeCryptoPairsToJson(
        data, 
        this.config.baseDir, 
        this.config.processedDir
      );

      const csvResult = writeCryptoPairsToCsv(
        data, 
        this.config.baseDir, 
        this.config.processedDir
      );

      // Store metadata
      await this.storeMetadata({
        timestamp,
        source,
        totalPairs: data.length,
        rawFile: rawResult.filePath,
        processedJsonFile: jsonResult.filePath,
        processedCsvFile: csvResult.filePath
      });

      return {
        success: true,
        message: `Successfully stored ${data.length} crypto pairs`,
        data: {
          raw: rawResult.data,
          processed: {
            json: jsonResult.data,
            csv: csvResult.data
          }
        },
        filePaths: [rawResult.filePath, jsonResult.filePath, csvResult.filePath]
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to store raw data',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Retrieve latest crypto pairs data
   */
  async getLatestData(): Promise<StorageResult> {
    try {
      // List all processed JSON files
      const listResult = listFilesInDirectory(
        join(this.config.baseDir, this.config.processedDir), 
        '.json'
      );

      if (!listResult.success || !listResult.data || listResult.data.length === 0) {
        return {
          success: false,
          message: 'No processed data found',
          error: 'No JSON files found in processed directory'
        };
      }

      // Sort by modification time (newest first)
      const sortedFiles = listResult.data.sort((a, b) => 
        new Date(b.modified).getTime() - new Date(a.modified).getTime()
      );

      // Read the latest file
      const latestFile = sortedFiles[0];
      const readResult = readCryptoPairsFromJson(latestFile.filePath);

      if (!readResult.success) {
        return {
          success: false,
          message: 'Failed to read latest data',
          error: readResult.error
        };
      }

      return {
        success: true,
        message: `Retrieved latest data with ${readResult.data.data.length} crypto pairs`,
        data: readResult.data
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve latest data',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Retrieve crypto pairs data by date range
   */
  async getDataByDateRange(startDate: string, endDate: string): Promise<StorageResult> {
    try {
      const listResult = listFilesInDirectory(
        join(this.config.baseDir, this.config.processedDir), 
        '.json'
      );

      if (!listResult.success || !listResult.data) {
        return {
          success: false,
          message: 'Failed to list files',
          error: listResult.error
        };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const filteredFiles = listResult.data.filter(file => {
        const fileDate = new Date(file.modified);
        return fileDate >= start && fileDate <= end;
      });

      if (filteredFiles.length === 0) {
        return {
          success: false,
          message: 'No data found for date range',
          error: `No files found between ${startDate} and ${endDate}`
        };
      }

      // Read all files in date range
      const allData = [];
      for (const file of filteredFiles) {
        const readResult = readCryptoPairsFromJson(file.filePath);
        if (readResult.success) {
          allData.push(readResult.data);
        }
      }

      return {
        success: true,
        message: `Retrieved ${allData.length} data files for date range`,
        data: allData
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve data by date range',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Search crypto pairs by symbol
   */
  async searchBySymbol(symbol: string): Promise<StorageResult> {
    try {
      const latestResult = await this.getLatestData();
      if (!latestResult.success) {
        return latestResult;
      }

      const data = latestResult.data.data;
      const filteredData = data.filter((pair: CryptoPair) => 
        pair.symbol.toLowerCase().includes(symbol.toLowerCase())
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
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageResult> {
    try {
      const stats = {
        raw: { count: 0, totalSize: 0 },
        processed: { count: 0, totalSize: 0 },
        metadata: { count: 0, totalSize: 0 },
        archive: { count: 0, totalSize: 0 }
      };

      // Count files in each directory
      for (const [dirName, dirPath] of Object.entries({
        raw: join(this.config.baseDir, this.config.rawDir),
        processed: join(this.config.baseDir, this.config.processedDir),
        metadata: join(this.config.baseDir, this.config.metadataDir),
        archive: join(this.config.baseDir, this.config.archiveDir)
      })) {
        const listResult = listFilesInDirectory(dirPath);
        if (listResult.success && listResult.data) {
          stats[dirName as keyof typeof stats] = {
            count: listResult.data.length,
            totalSize: listResult.data.reduce((sum, file) => sum + file.size, 0)
          };
        }
      }

      return {
        success: true,
        message: 'Storage statistics retrieved',
        data: {
          ...stats,
          config: this.config,
          timestamp: generateTimestamp()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to get storage statistics',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(): Promise<StorageResult> {
    try {
      const cleanedFiles = [];
      const errors = [];

      // Clean up processed files
      const processedList = listFilesInDirectory(
        join(this.config.baseDir, this.config.processedDir)
      );

      if (processedList.success && processedList.data) {
        for (const file of processedList.data) {
          if (isWithinDays(file.modified.toISOString(), this.config.maxFileAge)) {
            const archiveResult = await archiveFile(file.filePath, join(this.config.baseDir, this.config.archiveDir));
            if (archiveResult.success) {
              const deleteResult = deleteFile(file.filePath);
              if (deleteResult.success) {
                cleanedFiles.push(file.filename);
              } else {
                errors.push(`Failed to delete ${file.filename}: ${deleteResult.error}`);
              }
            } else {
              errors.push(`Failed to archive ${file.filename}: ${archiveResult.error}`);
            }
          }
        }
      }

      return {
        success: true,
        message: `Cleaned up ${cleanedFiles.length} old files`,
        data: {
          cleanedFiles,
          errors,
          timestamp: generateTimestamp()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to cleanup old files',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Store metadata
   */
  private async storeMetadata(metadata: any): Promise<void> {
    const metadataFile = join(this.config.baseDir, this.config.metadataDir, `metadata_${generateTimestamp()}.json`);
    const metadataContent = JSON.stringify(metadata, null, 2);
    
    // This would use the file operations, but for simplicity, we'll use fs directly
    const fs = await import('fs');
    fs.writeFileSync(metadataFile, metadataContent, 'utf8');
  }

  /**
   * Export data to external format
   */
  async exportData(format: 'json' | 'csv', filePath?: string): Promise<StorageResult> {
    try {
      const latestResult = await this.getLatestData();
      if (!latestResult.success) {
        return latestResult;
      }

      const data = latestResult.data.data;
      const timestamp = generateTimestamp();
      const exportPath = filePath || join(this.config.baseDir, `export_${format}_${timestamp}.${format}`);

      if (format === 'json') {
        const result = writeCryptoPairsToJson(data, dirname(exportPath), '', basename(exportPath));
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error,
          filePaths: result.filePath ? [result.filePath] : undefined
        };
      } else if (format === 'csv') {
        const result = writeCryptoPairsToCsv(data, dirname(exportPath), '', basename(exportPath));
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error,
          filePaths: result.filePath ? [result.filePath] : undefined
        };
      }

      return {
        success: false,
        message: 'Unsupported export format',
        error: `Format "${format}" is not supported. Use "json" or "csv".`
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to export data',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
