/**
 * Timestamp Utilities for Crypto Data Storage
 * 
 * Provides consistent timestamp formatting and parsing for file naming
 * and data versioning in the local file storage system.
 */

/**
 * Generate a timestamp string for file naming
 * Format: YYYY-MM-DDTHH-mm-ss
 */
export function generateTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Generate a timestamp string for display purposes
 * Format: YYYY-MM-DD HH:mm:ss
 */
export function generateDisplayTimestamp(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Parse a timestamp string back to Date object
 * Handles both file format and display format
 */
export function parseTimestamp(timestamp: string): Date {
  // Handle file format: YYYY-MM-DDTHH-mm-ss
  if (timestamp.includes('-') && timestamp.length === 19) {
    const normalized = timestamp.replace(/-/g, ':').replace('T', 'T');
    return new Date(normalized);
  }
  
  // Handle display format: YYYY-MM-DD HH:mm:ss
  if (timestamp.includes(' ') && timestamp.length === 19) {
    return new Date(timestamp.replace(' ', 'T'));
  }
  
  // Fallback to direct parsing
  return new Date(timestamp);
}

/**
 * Check if a timestamp is within the last N hours
 */
export function isWithinHours(timestamp: string, hours: number): boolean {
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hours;
}

/**
 * Check if a timestamp is within the last N days
 */
export function isWithinDays(timestamp: string, days: number): boolean {
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

/**
 * Get age of a timestamp in human-readable format
 */
export function getTimestampAge(timestamp: string): string {
  const date = parseTimestamp(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else {
    return `${diffDays} days ago`;
  }
}

/**
 * Generate a batch ID for file naming
 * Format: batch_001, batch_002, etc.
 */
export function generateBatchId(batchNumber: number): string {
  return `batch_${batchNumber.toString().padStart(3, '0')}`;
}

/**
 * Generate a file ID for unique file naming
 * Combines timestamp with optional prefix
 */
export function generateFileId(prefix: string = '', timestamp?: string): string {
  const ts = timestamp || generateTimestamp();
  return prefix ? `${prefix}_${ts}` : ts;
}




