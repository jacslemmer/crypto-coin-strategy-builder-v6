/**
 * Folder Organizer
 * 
 * Manages organized folder structure for screenshot sessions
 */

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, renameSync } from 'fs';
import { join, basename, extname } from 'path';

/**
 * Folder Organizer Class
 */
export class FolderOrganizer {
  constructor(config = {}) {
    this.config = {
      // Base output directory
      baseOutputDir: '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots',
      
      // Folder structure
      createTimestampedSessions: true,
      sessionPrefix: 'session',
      subdirectories: {
        originals: 'originals',
        metadata: 'metadata',
        logs: 'logs',
        backups: 'backups',
        processed: 'processed',
        failed: 'failed'
      },
      
      // File organization
      groupBySymbol: false,
      groupByDate: true,
      groupByBatch: false,
      
      // Naming conventions
      timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
      symbolSeparator: '_',
      batchPrefix: 'batch',
      
      // Cleanup and maintenance
      maxSessionsToKeep: 10,
      autoCleanup: false,
      cleanupOlderThanDays: 30,
      
      ...config
    };
  }

  /**
   * Create organized session directory structure
   * @param {string} sessionName - Optional custom session name
   * @returns {Object} Session directory information
   */
  createSessionDirectory(sessionName = null) {
    const timestamp = this.generateTimestamp();
    const sessionId = sessionName || `${this.config.sessionPrefix}_${timestamp}`;
    const sessionDir = join(this.config.baseOutputDir, sessionId);
    
    // Create main session directory
    this.ensureDirectoryExists(sessionDir);
    
    // Create subdirectories
    const subdirs = Object.values(this.config.subdirectories);
    const sessionStructure = {
      sessionDir,
      sessionId,
      timestamp,
      subdirectories: {}
    };
    
    subdirs.forEach(subdir => {
      const subdirPath = join(sessionDir, subdir);
      this.ensureDirectoryExists(subdirPath);
      sessionStructure.subdirectories[subdir] = subdirPath;
    });
    
    // Create additional organizational folders if needed
    if (this.config.groupBySymbol) {
      this.createSymbolFolders(sessionStructure.subdirectories.originals);
    }
    
    if (this.config.groupByBatch) {
      this.createBatchFolders(sessionStructure.subdirectories.originals);
    }
    
    // Create session metadata file
    this.createSessionMetadata(sessionStructure);
    
    return sessionStructure;
  }

  /**
   * Organize screenshot files within session
   * @param {string} sessionDir - Session directory path
   * @param {Array} screenshots - Array of screenshot information
   */
  organizeScreenshots(sessionDir, screenshots) {
    const organizedFiles = {
      successful: [],
      failed: [],
      moved: [],
      errors: []
    };
    
    screenshots.forEach(screenshot => {
      try {
        const organization = this.organizeScreenshot(sessionDir, screenshot);
        
        if (organization.success) {
          if (screenshot.success) {
            organizedFiles.successful.push(organization);
          } else {
            organizedFiles.failed.push(organization);
          }
          organizedFiles.moved.push(organization);
        } else {
          organizedFiles.errors.push({
            screenshot,
            error: organization.error
          });
        }
      } catch (error) {
        organizedFiles.errors.push({
          screenshot,
          error: error.message
        });
      }
    });
    
    return organizedFiles;
  }

  /**
   * Organize individual screenshot file
   * @param {string} sessionDir - Session directory path
   * @param {Object} screenshot - Screenshot information
   * @returns {Object} Organization result
   */
  organizeScreenshot(sessionDir, screenshot) {
    const result = {
      success: false,
      originalPath: screenshot.filePath,
      newPath: null,
      metadataPath: null,
      error: null
    };
    
    try {
      if (!existsSync(screenshot.filePath)) {
        result.error = 'Source file does not exist';
        return result;
      }
      
      // Determine target directory based on success/failure
      const targetSubdir = screenshot.success ? 
        this.config.subdirectories.originals : 
        this.config.subdirectories.failed;
      
      let targetDir = join(sessionDir, targetSubdir);
      
      // Apply grouping rules
      if (this.config.groupBySymbol && screenshot.symbol) {
        targetDir = join(targetDir, screenshot.symbol);
        this.ensureDirectoryExists(targetDir);
      }
      
      if (this.config.groupByBatch && screenshot.batchNumber) {
        targetDir = join(targetDir, `${this.config.batchPrefix}_${screenshot.batchNumber}`);
        this.ensureDirectoryExists(targetDir);
      }
      
      if (this.config.groupByDate) {
        const dateFolder = this.getDateFolder(screenshot.timestamp);
        targetDir = join(targetDir, dateFolder);
        this.ensureDirectoryExists(targetDir);
      }
      
      // Generate new filename
      const newFileName = this.generateFileName(screenshot);
      const newPath = join(targetDir, newFileName);
      
      // Move or copy file
      if (screenshot.moveFile !== false) {
        renameSync(screenshot.filePath, newPath);
      } else {
        copyFileSync(screenshot.filePath, newPath);
      }
      
      result.newPath = newPath;
      result.success = true;
      
      // Create metadata file
      if (screenshot.metadata) {
        const metadataPath = this.createMetadataFile(sessionDir, screenshot, newPath);
        result.metadataPath = metadataPath;
      }
      
    } catch (error) {
      result.error = error.message;
    }
    
    return result;
  }

  /**
   * Create metadata file for screenshot
   * @param {string} sessionDir - Session directory path
   * @param {Object} screenshot - Screenshot information
   * @param {string} filePath - Screenshot file path
   * @returns {string} Metadata file path
   */
  createMetadataFile(sessionDir, screenshot, filePath) {
    const metadata = {
      screenshot: {
        symbol: screenshot.symbol,
        pair: screenshot.pair || `${screenshot.symbol}USDT`,
        timestamp: screenshot.timestamp,
        batchNumber: screenshot.batchNumber,
        filePath: filePath,
        fileName: basename(filePath),
        fileSize: screenshot.fileSize || 0,
        dimensions: screenshot.dimensions || {},
        quality: screenshot.quality || {}
      },
      processing: {
        success: screenshot.success,
        error: screenshot.error || null,
        processingTime: screenshot.processingTime || 0,
        retryCount: screenshot.retryCount || 0,
        validation: screenshot.validation || {}
      },
      session: {
        sessionId: screenshot.sessionId,
        config: screenshot.config || {}
      },
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    const metadataFileName = basename(filePath, extname(filePath)) + '_metadata.json';
    const metadataPath = join(sessionDir, this.config.subdirectories.metadata, metadataFileName);
    
    const fs = require('fs');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return metadataPath;
  }

  /**
   * Create session metadata file
   * @param {Object} sessionStructure - Session structure information
   */
  createSessionMetadata(sessionStructure) {
    const sessionMetadata = {
      session: {
        id: sessionStructure.sessionId,
        timestamp: sessionStructure.timestamp,
        created: new Date().toISOString(),
        directory: sessionStructure.sessionDir
      },
      structure: {
        subdirectories: sessionStructure.subdirectories,
        organization: {
          groupBySymbol: this.config.groupBySymbol,
          groupByDate: this.config.groupByDate,
          groupByBatch: this.config.groupByBatch
        }
      },
      config: this.config,
      metadata: {
        version: '1.0.0',
        createdBy: 'FolderOrganizer'
      }
    };
    
    const metadataPath = join(sessionStructure.sessionDir, 'session_metadata.json');
    const fs = require('fs');
    fs.writeFileSync(metadataPath, JSON.stringify(sessionMetadata, null, 2));
  }

  /**
   * Generate organized filename for screenshot
   * @param {Object} screenshot - Screenshot information
   * @returns {string} Generated filename
   */
  generateFileName(screenshot) {
    const parts = [];
    
    // Add symbol
    if (screenshot.symbol) {
      parts.push(screenshot.symbol.toUpperCase());
    }
    
    // Add pair
    if (screenshot.pair) {
      parts.push(screenshot.pair);
    } else if (screenshot.symbol) {
      parts.push(`${screenshot.symbol.toUpperCase()}USDT`);
    }
    
    // Add timestamp
    if (screenshot.timestamp) {
      const timestamp = new Date(screenshot.timestamp)
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      parts.push(timestamp);
    }
    
    // Add batch number if available
    if (screenshot.batchNumber) {
      parts.push(`batch${screenshot.batchNumber}`);
    }
    
    // Add status indicator
    if (!screenshot.success) {
      parts.push('FAILED');
    }
    
    const baseName = parts.join(this.config.symbolSeparator);
    return `${baseName}.png`;
  }

  /**
   * Create symbol-specific folders
   * @param {string} baseDir - Base directory path
   */
  createSymbolFolders(baseDir) {
    // This would create folders for each symbol
    // Implementation depends on the symbols being processed
  }

  /**
   * Create batch-specific folders
   * @param {string} baseDir - Base directory path
   */
  createBatchFolders(baseDir) {
    // This would create folders for each batch
    // Implementation depends on the batch structure
  }

  /**
   * Get date folder name
   * @param {string} timestamp - Timestamp string
   * @returns {string} Date folder name
   */
  getDateFolder(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Generate timestamp string
   * @returns {string} Formatted timestamp
   */
  generateTimestamp() {
    return new Date().toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path
   */
  ensureDirectoryExists(dirPath) {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * List existing sessions
   * @returns {Array} Array of session information
   */
  listSessions() {
    if (!existsSync(this.config.baseOutputDir)) {
      return [];
    }
    
    const sessions = [];
    const entries = readdirSync(this.config.baseOutputDir, { withFileTypes: true });
    
    entries.forEach(entry => {
      if (entry.isDirectory() && entry.name.startsWith(this.config.sessionPrefix)) {
        const sessionPath = join(this.config.baseOutputDir, entry.name);
        const stats = statSync(sessionPath);
        
        sessions.push({
          name: entry.name,
          path: sessionPath,
          created: stats.birthtime,
          modified: stats.mtime,
          size: this.getDirectorySize(sessionPath)
        });
      }
    });
    
    // Sort by creation date (newest first)
    return sessions.sort((a, b) => b.created - a.created);
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath - Directory path
   * @returns {number} Directory size in bytes
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      entries.forEach(entry => {
        const entryPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          totalSize += this.getDirectorySize(entryPath);
        } else {
          totalSize += statSync(entryPath).size;
        }
      });
    } catch (error) {
      // Ignore errors when calculating size
    }
    
    return totalSize;
  }

  /**
   * Clean up old sessions
   * @param {number} keepCount - Number of recent sessions to keep
   */
  cleanupOldSessions(keepCount = null) {
    const sessions = this.listSessions();
    const sessionsToKeep = keepCount || this.config.maxSessionsToKeep;
    
    if (sessions.length <= sessionsToKeep) {
      return { deleted: 0, errors: [] };
    }
    
    const sessionsToDelete = sessions.slice(sessionsToKeep);
    const results = { deleted: 0, errors: [] };
    
    sessionsToDelete.forEach(session => {
      try {
        const fs = require('fs');
        fs.rmSync(session.path, { recursive: true, force: true });
        results.deleted++;
      } catch (error) {
        results.errors.push({
          session: session.name,
          error: error.message
        });
      }
    });
    
    return results;
  }

  /**
   * Get session summary
   * @param {string} sessionDir - Session directory path
   * @returns {Object} Session summary
   */
  getSessionSummary(sessionDir) {
    const summary = {
      sessionDir,
      exists: existsSync(sessionDir),
      subdirectories: {},
      fileCounts: {},
      totalSize: 0,
      metadata: null
    };
    
    if (!summary.exists) {
      return summary;
    }
    
    // Check subdirectories
    Object.entries(this.config.subdirectories).forEach(([key, subdir]) => {
      const subdirPath = join(sessionDir, subdir);
      summary.subdirectories[key] = {
        path: subdirPath,
        exists: existsSync(subdirPath),
        fileCount: 0,
        size: 0
      };
      
      if (summary.subdirectories[key].exists) {
        const stats = this.getDirectoryStats(subdirPath);
        summary.subdirectories[key].fileCount = stats.fileCount;
        summary.subdirectories[key].size = stats.size;
        summary.fileCounts[key] = stats.fileCount;
        summary.totalSize += stats.size;
      }
    });
    
    // Load session metadata if available
    const metadataPath = join(sessionDir, 'session_metadata.json');
    if (existsSync(metadataPath)) {
      try {
        const fs = require('fs');
        summary.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        summary.metadata = { error: error.message };
      }
    }
    
    return summary;
  }

  /**
   * Get directory statistics
   * @param {string} dirPath - Directory path
   * @returns {Object} Directory statistics
   */
  getDirectoryStats(dirPath) {
    let fileCount = 0;
    let totalSize = 0;
    
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      
      entries.forEach(entry => {
        const entryPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subStats = this.getDirectoryStats(entryPath);
          fileCount += subStats.fileCount;
          totalSize += subStats.size;
        } else {
          fileCount++;
          totalSize += statSync(entryPath).size;
        }
      });
    } catch (error) {
      // Ignore errors
    }
    
    return { fileCount, size: totalSize };
  }
}
