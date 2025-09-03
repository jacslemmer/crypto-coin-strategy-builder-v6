/**
 * File Operations for Crypto Data Storage
 * 
 * Provides file-based CRUD operations for cryptocurrency market data
 * with proper error handling and file organization.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { generateTimestamp, generateFileId } from '../utils/timestamp-utils.js';
import { validateCryptoPairs, sanitizeCryptoPair, generateValidationReport, CryptoPair } from '../validation/data-validator.js';

/**
 * File operation result interface
 */
export interface FileOperationResult {
  success: boolean;
  message: string;
  filePath?: string;
  data?: any;
  error?: string;
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  timestamp: string;
  source: string;
  totalPairs: number;
  fileSize: number;
  filePath: string;
  validation?: any;
}

/**
 * Ensure directory exists, create if it doesn't
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write crypto pairs data to JSON file
 */
export function writeCryptoPairsToJson(
  data: any[], 
  baseDir: string, 
  subDir: string = 'processed',
  filename?: string
): FileOperationResult {
  try {
    const dirPath = join(baseDir, subDir);
    ensureDirectoryExists(dirPath);

    // Sanitize and validate data
    const sanitizedData = data.map(sanitizeCryptoPair);
    const validation = validateCryptoPairs(sanitizedData);

    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        error: validation.errors.join('; ')
      };
    }

    // Generate filename if not provided
    const finalFilename = filename || `crypto_pairs_${generateTimestamp()}.json`;
    const filePath = join(dirPath, finalFilename);

    // Create metadata
    const metadata: FileMetadata = {
      timestamp: generateTimestamp(),
      source: 'coingecko-api',
      totalPairs: sanitizedData.length,
      fileSize: 0, // Will be updated after writing
      filePath: filePath
    };

    // Prepare data with metadata
    const fileData = {
      metadata,
      data: sanitizedData,
      validation: generateValidationReport(sanitizedData, metadata)
    };

    // Write file
    const jsonContent = JSON.stringify(fileData, null, 2);
    writeFileSync(filePath, jsonContent, 'utf8');

    // Update file size in metadata
    const stats = statSync(filePath);
    metadata.fileSize = stats.size;

    return {
      success: true,
      message: `Successfully wrote ${sanitizedData.length} crypto pairs to JSON file`,
      filePath,
      data: fileData
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to write JSON file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Write crypto pairs data to CSV file
 */
export function writeCryptoPairsToCsv(
  data: any[], 
  baseDir: string, 
  subDir: string = 'processed',
  filename?: string
): FileOperationResult {
  try {
    const dirPath = join(baseDir, subDir);
    ensureDirectoryExists(dirPath);

    // Sanitize and validate data
    const sanitizedData = data.map(sanitizeCryptoPair);
    const validation = validateCryptoPairs(sanitizedData);

    if (!validation.isValid) {
      return {
        success: false,
        message: 'Data validation failed',
        error: validation.errors.join('; ')
      };
    }

    // Generate filename if not provided
    const finalFilename = filename || `crypto_pairs_${generateTimestamp()}.csv`;
    const filePath = join(dirPath, finalFilename);

    // Create CSV header
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
      'Max Supply',
      'Timestamp'
    ];

    // Create CSV rows
    const csvRows = sanitizedData.map(pair => [
      `"${pair.symbol}"`,
      `"${pair.name}"`,
      pair.price,
      pair.marketCap,
      pair.rank,
      pair.volume24h,
      pair.priceChange24h,
      pair.circulatingSupply || '',
      pair.totalSupply || '',
      pair.maxSupply || '',
      `"${pair.timestamp}"`
    ]);

    // Combine header and rows
    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Write file
    writeFileSync(filePath, csvContent, 'utf8');

    // Create metadata
    const metadata: FileMetadata = {
      timestamp: generateTimestamp(),
      source: 'coingecko-api',
      totalPairs: sanitizedData.length,
      fileSize: csvContent.length,
      filePath: filePath
    };

    return {
      success: true,
      message: `Successfully wrote ${sanitizedData.length} crypto pairs to CSV file`,
      filePath,
      data: { metadata, validation }
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to write CSV file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Read crypto pairs data from JSON file
 */
export function readCryptoPairsFromJson(filePath: string): FileOperationResult {
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        message: 'File does not exist',
        error: `File not found: ${filePath}`
      };
    }

    const fileContent = readFileSync(filePath, 'utf8');
    const fileData = JSON.parse(fileContent);

    // Validate file structure
    if (!fileData.data || !Array.isArray(fileData.data)) {
      return {
        success: false,
        message: 'Invalid file format',
        error: 'File does not contain valid crypto pairs data'
      };
    }

    return {
      success: true,
      message: `Successfully read ${fileData.data.length} crypto pairs from JSON file`,
      filePath,
      data: fileData
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to read JSON file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Read crypto pairs data from CSV file
 */
export function readCryptoPairsFromCsv(filePath: string): FileOperationResult {
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        message: 'File does not exist',
        error: `File not found: ${filePath}`
      };
    }

    const fileContent = readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        message: 'Invalid CSV format',
        error: 'CSV file must have at least a header and one data row'
      };
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    // Parse data rows
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const pair: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'Symbol':
            pair.symbol = value;
            break;
          case 'Name':
            pair.name = value;
            break;
          case 'Price (USD)':
            pair.price = Number(value);
            break;
          case 'Market Cap':
            pair.marketCap = Number(value);
            break;
          case 'Rank':
            pair.rank = Number(value);
            break;
          case '24h Volume':
            pair.volume24h = Number(value);
            break;
          case '24h Price Change %':
            pair.priceChange24h = Number(value);
            break;
          case 'Circulating Supply':
            pair.circulatingSupply = value ? Number(value) : undefined;
            break;
          case 'Total Supply':
            pair.totalSupply = value ? Number(value) : undefined;
            break;
          case 'Max Supply':
            pair.maxSupply = value ? Number(value) : undefined;
            break;
          case 'Timestamp':
            pair.timestamp = value;
            break;
        }
      });
      
      return pair;
    });

    return {
      success: true,
      message: `Successfully read ${data.length} crypto pairs from CSV file`,
      filePath,
      data: { data, metadata: { source: 'csv-import', totalPairs: data.length } }
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to read CSV file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * List all files in a directory with metadata
 */
export function listFilesInDirectory(dirPath: string, extension?: string): FileOperationResult {
  try {
    if (!existsSync(dirPath)) {
      return {
        success: false,
        message: 'Directory does not exist',
        error: `Directory not found: ${dirPath}`
      };
    }

    const files = readdirSync(dirPath);
    const filteredFiles = extension ? files.filter(f => f.endsWith(extension)) : files;

    const fileList = filteredFiles.map(filename => {
      const filePath = join(dirPath, filename);
      const stats = statSync(filePath);
      
      return {
        filename,
        filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: extname(filename)
      };
    });

    return {
      success: true,
      message: `Found ${fileList.length} files in directory`,
      data: fileList
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to list directory',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete a file
 */
export function deleteFile(filePath: string): FileOperationResult {
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        message: 'File does not exist',
        error: `File not found: ${filePath}`
      };
    }

    unlinkSync(filePath);

    return {
      success: true,
      message: 'File deleted successfully',
      filePath
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Archive old files (move to archive directory)
 */
export function archiveFile(filePath: string, archiveDir: string): FileOperationResult {
  try {
    if (!existsSync(filePath)) {
      return {
        success: false,
        message: 'File does not exist',
        error: `File not found: ${filePath}`
      };
    }

    ensureDirectoryExists(archiveDir);

    const filename = basename(filePath);
    const archivePath = join(archiveDir, filename);

    // For now, just copy the file (in a real implementation, you might want to move it)
    const fileContent = readFileSync(filePath, 'utf8');
    writeFileSync(archivePath, fileContent, 'utf8');

    return {
      success: true,
      message: 'File archived successfully',
      filePath: archivePath
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to archive file',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}




