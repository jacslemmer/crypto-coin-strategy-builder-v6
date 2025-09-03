/**
 * Data Validator for Crypto Pairs Storage
 * 
 * Provides validation functions for cryptocurrency market data
 * to ensure data integrity and consistency in the local file storage system.
 */

/**
 * Interface for crypto pair data structure
 */
export interface CryptoPair {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  rank: number;
  volume24h: number;
  priceChange24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  timestamp?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a single crypto pair object
 */
export function validateCryptoPair(pair: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!pair.symbol || typeof pair.symbol !== 'string' || pair.symbol.trim() === '') {
    errors.push('Symbol is required and must be a non-empty string');
  }

  if (!pair.name || typeof pair.name !== 'string' || pair.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }

  if (typeof pair.price !== 'number' || isNaN(pair.price) || pair.price < 0) {
    errors.push('Price must be a valid non-negative number');
  }

  if (typeof pair.marketCap !== 'number' || isNaN(pair.marketCap) || pair.marketCap < 0) {
    errors.push('Market cap must be a valid non-negative number');
  }

  if (typeof pair.rank !== 'number' || isNaN(pair.rank) || pair.rank < 1) {
    errors.push('Rank must be a valid positive integer');
  }

  if (typeof pair.volume24h !== 'number' || isNaN(pair.volume24h) || pair.volume24h < 0) {
    errors.push('24h volume must be a valid non-negative number');
  }

  if (typeof pair.priceChange24h !== 'number' || isNaN(pair.priceChange24h)) {
    errors.push('24h price change must be a valid number');
  }

  // Optional fields validation
  if (pair.circulatingSupply !== undefined && (typeof pair.circulatingSupply !== 'number' || isNaN(pair.circulatingSupply) || pair.circulatingSupply < 0)) {
    errors.push('Circulating supply must be a valid non-negative number');
  }

  if (pair.totalSupply !== undefined && (typeof pair.totalSupply !== 'number' || isNaN(pair.totalSupply) || pair.totalSupply < 0)) {
    errors.push('Total supply must be a valid non-negative number');
  }

  if (pair.maxSupply !== undefined && (typeof pair.maxSupply !== 'number' || isNaN(pair.maxSupply) || pair.maxSupply < 0)) {
    errors.push('Max supply must be a valid non-negative number');
  }

  // Data quality warnings
  if (pair.price === 0) {
    warnings.push('Price is zero - may indicate data quality issue');
  }

  if (pair.marketCap === 0) {
    warnings.push('Market cap is zero - may indicate data quality issue');
  }

  if (pair.volume24h === 0) {
    warnings.push('24h volume is zero - may indicate low liquidity');
  }

  if (Math.abs(pair.priceChange24h) > 100) {
    warnings.push('24h price change is very high (>100%) - verify data accuracy');
  }

  // Symbol format validation
  if (pair.symbol && !/^[A-Z0-9]+$/.test(pair.symbol)) {
    warnings.push('Symbol should contain only uppercase letters and numbers');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate an array of crypto pairs
 */
export function validateCryptoPairs(pairs: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(pairs)) {
    errors.push('Data must be an array of crypto pairs');
    return { isValid: false, errors, warnings };
  }

  if (pairs.length === 0) {
    warnings.push('No crypto pairs found in data');
  }

  // Validate each pair
  pairs.forEach((pair, index) => {
    const result = validateCryptoPair(pair);
    if (!result.isValid) {
      errors.push(`Pair ${index + 1}: ${result.errors.join(', ')}`);
    }
    warnings.push(...result.warnings.map(w => `Pair ${index + 1}: ${w}`));
  });

  // Check for duplicate symbols
  const symbols = pairs.map(p => p.symbol).filter(Boolean);
  const uniqueSymbols = new Set(symbols);
  if (symbols.length !== uniqueSymbols.size) {
    errors.push('Duplicate symbols found in data');
  }

  // Check for reasonable data range
  if (pairs.length > 0) {
    const validPairs = pairs.filter(p => validateCryptoPair(p).isValid);
    if (validPairs.length < pairs.length * 0.8) {
      warnings.push('Less than 80% of pairs passed validation - data quality may be poor');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate file metadata
 */
export function validateFileMetadata(metadata: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!metadata) {
    errors.push('Metadata is required');
    return { isValid: false, errors, warnings };
  }

  if (!metadata.timestamp || typeof metadata.timestamp !== 'string') {
    errors.push('Timestamp is required in metadata');
  }

  if (!metadata.source || typeof metadata.source !== 'string') {
    errors.push('Source is required in metadata');
  }

  if (metadata.totalPairs !== undefined && (typeof metadata.totalPairs !== 'number' || metadata.totalPairs < 0)) {
    errors.push('Total pairs must be a valid non-negative number');
  }

  if (metadata.fileSize !== undefined && (typeof metadata.fileSize !== 'number' || metadata.fileSize < 0)) {
    errors.push('File size must be a valid non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize crypto pair data for storage
 */
export function sanitizeCryptoPair(pair: any): CryptoPair {
  return {
    symbol: String(pair.symbol || '').trim().toUpperCase(),
    name: String(pair.name || '').trim(),
    price: Number(pair.price || 0),
    marketCap: Number(pair.market_cap || pair.marketCap || 0),
    rank: Number(pair.market_cap_rank || pair.rank || 0),
    volume24h: Number(pair.total_volume || pair.volume24h || 0),
    priceChange24h: Number(pair.price_change_percentage_24h || pair.priceChange24h || 0),
    circulatingSupply: pair.circulating_supply !== undefined ? Number(pair.circulating_supply) : undefined,
    totalSupply: pair.total_supply !== undefined ? Number(pair.total_supply) : undefined,
    maxSupply: pair.max_supply !== undefined ? Number(pair.max_supply) : undefined,
    timestamp: pair.timestamp || new Date().toISOString()
  };
}

/**
 * Generate validation report
 */
export function generateValidationReport(pairs: any[], metadata?: any): any {
  const pairValidation = validateCryptoPairs(pairs);
  const metadataValidation = metadata ? validateFileMetadata(metadata) : { isValid: true, errors: [], warnings: [] };

  return {
    timestamp: new Date().toISOString(),
    totalPairs: pairs.length,
    validPairs: pairs.filter(p => validateCryptoPair(p).isValid).length,
    invalidPairs: pairs.filter(p => !validateCryptoPair(p).isValid).length,
    overallValid: pairValidation.isValid && metadataValidation.isValid,
    errors: [...pairValidation.errors, ...metadataValidation.errors],
    warnings: [...pairValidation.warnings, ...metadataValidation.warnings],
    metadata: {
      ...metadata,
      validation: metadataValidation
    }
  };
}




