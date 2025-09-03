/**
 * Screenshot Quality Validator
 * 
 * Validates screenshot quality, dimensions, and content
 */

import { existsSync, statSync } from 'fs';
import sharp from 'sharp';

/**
 * Quality Validator Class
 */
export class QualityValidator {
  constructor(config = {}) {
    this.config = {
      // File size constraints
      minFileSizeKB: 100,
      maxFileSizeKB: 5000,
      
      // Dimension constraints
      requiredWidth: 1920,
      requiredHeight: 1080,
      tolerancePixels: 5, // Allow small tolerance for dimensions
      
      // Content validation
      minBrightness: 0.1, // Minimum average brightness (0-1)
      maxBrightness: 0.9, // Maximum average brightness (0-1)
      minContrast: 0.1, // Minimum contrast ratio
      
      // TradingView specific validation
      expectedElements: {
        hasChart: true,
        hasTimeframe: true,
        hasPriceAxis: true
      },
      
      ...config
    };
  }

  /**
   * Validate screenshot quality
   * @param {string} filePath - Path to screenshot file
   * @returns {Object} Validation result
   */
  async validateScreenshot(filePath) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      fileSizeKB: 0,
      dimensions: { width: 0, height: 0 },
      metadata: {},
      quality: {
        brightness: 0,
        contrast: 0,
        sharpness: 0
      }
    };

    try {
      // Basic file existence check
      if (!existsSync(filePath)) {
        validation.valid = false;
        validation.errors.push('File does not exist');
        return validation;
      }

      // File size validation
      const fileSizeValidation = await this.validateFileSize(filePath);
      validation.fileSizeKB = fileSizeValidation.fileSizeKB;
      validation.errors.push(...fileSizeValidation.errors);
      validation.warnings.push(...fileSizeValidation.warnings);

      // Image dimension validation
      const dimensionValidation = await this.validateDimensions(filePath);
      validation.dimensions = dimensionValidation.dimensions;
      validation.errors.push(...dimensionValidation.errors);
      validation.warnings.push(...dimensionValidation.warnings);

      // Image quality validation
      const qualityValidation = await this.validateImageQuality(filePath);
      validation.quality = qualityValidation.quality;
      validation.errors.push(...qualityValidation.errors);
      validation.warnings.push(...qualityValidation.warnings);

      // TradingView specific validation
      const tradingViewValidation = await this.validateTradingViewContent(filePath);
      validation.errors.push(...tradingViewValidation.errors);
      validation.warnings.push(...tradingViewValidation.warnings);

      // Overall validation result
      validation.valid = validation.errors.length === 0;

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Validate file size
   * @param {string} filePath - Path to file
   * @returns {Object} File size validation result
   */
  async validateFileSize(filePath) {
    const result = {
      fileSizeKB: 0,
      errors: [],
      warnings: []
    };

    try {
      const stats = statSync(filePath);
      result.fileSizeKB = Math.round(stats.size / 1024);

      if (result.fileSizeKB < this.config.minFileSizeKB) {
        result.errors.push(`File too small: ${result.fileSizeKB}KB < ${this.config.minFileSizeKB}KB`);
      } else if (result.fileSizeKB > this.config.maxFileSizeKB) {
        result.errors.push(`File too large: ${result.fileSizeKB}KB > ${this.config.maxFileSizeKB}KB`);
      }

      // Check for suspiciously small files (likely loading errors)
      if (result.fileSizeKB < 50) {
        result.errors.push('File too small, likely TradingView loading error or empty page');
      }

      // Warning for very large files
      if (result.fileSizeKB > 2000) {
        result.warnings.push(`Large file size: ${result.fileSizeKB}KB (may indicate high-quality capture)`);
      }

    } catch (error) {
      result.errors.push(`File size validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate image dimensions
   * @param {string} filePath - Path to image file
   * @returns {Object} Dimension validation result
   */
  async validateDimensions(filePath) {
    const result = {
      dimensions: { width: 0, height: 0 },
      errors: [],
      warnings: []
    };

    try {
      const metadata = await sharp(filePath).metadata();
      result.dimensions = {
        width: metadata.width,
        height: metadata.height
      };

      // Check exact dimensions
      if (metadata.width !== this.config.requiredWidth) {
        const diff = Math.abs(metadata.width - this.config.requiredWidth);
        if (diff > this.config.tolerancePixels) {
          result.errors.push(`Width mismatch: ${metadata.width}px (expected ${this.config.requiredWidth}px)`);
        } else {
          result.warnings.push(`Width slightly off: ${metadata.width}px (expected ${this.config.requiredWidth}px)`);
        }
      }

      if (metadata.height !== this.config.requiredHeight) {
        const diff = Math.abs(metadata.height - this.config.requiredHeight);
        if (diff > this.config.tolerancePixels) {
          result.errors.push(`Height mismatch: ${metadata.height}px (expected ${this.config.requiredHeight}px)`);
        } else {
          result.warnings.push(`Height slightly off: ${metadata.height}px (expected ${this.config.requiredHeight}px)`);
        }
      }

      // Check aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      const expectedAspectRatio = this.config.requiredWidth / this.config.requiredHeight;
      const aspectRatioDiff = Math.abs(aspectRatio - expectedAspectRatio);
      
      if (aspectRatioDiff > 0.01) {
        result.warnings.push(`Aspect ratio deviation: ${aspectRatio.toFixed(3)} (expected ${expectedAspectRatio.toFixed(3)})`);
      }

    } catch (error) {
      result.errors.push(`Dimension validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate image quality metrics
   * @param {string} filePath - Path to image file
   * @returns {Object} Quality validation result
   */
  async validateImageQuality(filePath) {
    const result = {
      quality: {
        brightness: 0,
        contrast: 0,
        sharpness: 0
      },
      errors: [],
      warnings: []
    };

    try {
      // Get image statistics
      const stats = await sharp(filePath)
        .stats()
        .toBuffer();

      const image = sharp(filePath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

      // Calculate brightness (average of all pixel values)
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        // Use luminance formula for RGB
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        totalBrightness += luminance;
      }
      
      result.quality.brightness = totalBrightness / (data.length / info.channels);

      // Check brightness range
      if (result.quality.brightness < this.config.minBrightness) {
        result.errors.push(`Image too dark: brightness ${result.quality.brightness.toFixed(3)} < ${this.config.minBrightness}`);
      } else if (result.quality.brightness > this.config.maxBrightness) {
        result.errors.push(`Image too bright: brightness ${result.quality.brightness.toFixed(3)} > ${this.config.maxBrightness}`);
      }

      // Calculate contrast (standard deviation of pixel values)
      let variance = 0;
      const mean = result.quality.brightness;
      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        variance += Math.pow(luminance - mean, 2);
      }
      
      result.quality.contrast = Math.sqrt(variance / (data.length / info.channels));

      if (result.quality.contrast < this.config.minContrast) {
        result.warnings.push(`Low contrast: ${result.quality.contrast.toFixed(3)} < ${this.config.minContrast}`);
      }

      // Basic sharpness check (edge detection simulation)
      result.quality.sharpness = await this.calculateSharpness(filePath);

    } catch (error) {
      result.errors.push(`Quality validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Calculate image sharpness using edge detection
   * @param {string} filePath - Path to image file
   * @returns {number} Sharpness score (0-1)
   */
  async calculateSharpness(filePath) {
    try {
      // Convert to grayscale and resize for faster processing
      const { data, info } = await sharp(filePath)
        .greyscale()
        .resize(200, 200)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let edgeSum = 0;
      const width = info.width;
      const height = info.height;

      // Simple edge detection using Sobel operator
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          
          // Sobel X
          const gx = 
            -1 * data[(y-1) * width + (x-1)] +
             1 * data[(y-1) * width + (x+1)] +
            -2 * data[y * width + (x-1)] +
             2 * data[y * width + (x+1)] +
            -1 * data[(y+1) * width + (x-1)] +
             1 * data[(y+1) * width + (x+1)];

          // Sobel Y
          const gy = 
            -1 * data[(y-1) * width + (x-1)] +
            -2 * data[(y-1) * width + x] +
            -1 * data[(y-1) * width + (x+1)] +
             1 * data[(y+1) * width + (x-1)] +
             2 * data[(y+1) * width + x] +
             1 * data[(y+1) * width + (x+1)];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          edgeSum += magnitude;
        }
      }

      // Normalize sharpness score
      const maxPossibleEdges = (width - 2) * (height - 2) * 255 * Math.sqrt(2);
      return Math.min(edgeSum / maxPossibleEdges, 1);

    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate TradingView specific content
   * @param {string} filePath - Path to image file
   * @returns {Object} TradingView validation result
   */
  async validateTradingViewContent(filePath) {
    const result = {
      errors: [],
      warnings: []
    };

    try {
      // Basic checks for TradingView content
      const { data, info } = await sharp(filePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Check for common TradingView colors (basic heuristic)
      let hasDarkBackground = false;
      let hasLightText = false;
      let hasChartColors = false;

      // Sample pixels to check for TradingView-like content
      const sampleSize = Math.min(1000, data.length / info.channels);
      for (let i = 0; i < sampleSize; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check for dark background (common in TradingView)
        if (r < 50 && g < 50 && b < 50) {
          hasDarkBackground = true;
        }
        
        // Check for light text/UI elements
        if (r > 200 && g > 200 && b > 200) {
          hasLightText = true;
        }
        
        // Check for chart colors (green/red for candlesticks)
        if ((r > 100 && g > 150 && b < 100) || (r > 150 && g < 100 && b < 100)) {
          hasChartColors = true;
        }
      }

      // Validate expected elements
      if (this.config.expectedElements.hasChart && !hasChartColors) {
        result.warnings.push('No chart colors detected - may not be a valid chart');
      }

      if (!hasDarkBackground && !hasLightText) {
        result.warnings.push('Unusual color scheme - may not be TradingView interface');
      }

    } catch (error) {
      result.errors.push(`TradingView validation error: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate multiple screenshots in batch
   * @param {Array} filePaths - Array of file paths
   * @returns {Array} Array of validation results
   */
  async validateBatch(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const validation = await this.validateScreenshot(filePath);
      results.push({
        filePath,
        ...validation
      });
    }
    
    return results;
  }

  /**
   * Get validation summary for a batch
   * @param {Array} validationResults - Array of validation results
   * @returns {Object} Summary statistics
   */
  getValidationSummary(validationResults) {
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.valid).length;
    const invalid = total - valid;
    
    const errors = validationResults.reduce((acc, r) => acc + r.errors.length, 0);
    const warnings = validationResults.reduce((acc, r) => acc + r.warnings.length, 0);
    
    const avgFileSize = valid > 0 ? 
      Math.round(validationResults.filter(r => r.valid).reduce((sum, r) => sum + r.fileSizeKB, 0) / valid) : 0;
    
    return {
      total,
      valid,
      invalid,
      successRate: total > 0 ? ((valid / total) * 100).toFixed(2) : 0,
      totalErrors: errors,
      totalWarnings: warnings,
      averageFileSizeKB: avgFileSize
    };
  }
}
