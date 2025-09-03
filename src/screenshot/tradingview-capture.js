/**
 * TradingView Screenshot Capture
 * 
 * Captures screenshots of TradingView charts using Puppeteer
 */

import puppeteer from 'puppeteer';
import { writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { generateTradingViewUrl } from './url-generator.js';

/**
 * Configuration for screenshot capture
 */
const SCREENSHOT_CONFIG = {
  viewport: {
    width: 1920,
    height: 1080
  },
  timeout: 30000, // 30 seconds
  retries: 3,
  delay: 2000, // 2 seconds delay after page load
  chartLoadDelay: 5000, // 5 seconds for chart to fully load
  outputDir: '/Users/jacobuslemmer/Desktop/CLI App testing/screenshots'
};

/**
 * TradingView Screenshot Capture Class
 */
export class TradingViewCapture {
  constructor(config = {}) {
    this.config = { ...SCREENSHOT_CONFIG, ...config };
    this.browser = null;
    this.page = null;
  }

  /**
   * Initialize browser and page
   */
  async initialize() {
    console.log('🚀 Initializing TradingView screenshot capture...');
    
    try {
      // Launch browser with better configuration for TradingView
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--window-size=1920,1080'
        ],
        timeout: 60000 // 60 seconds for browser launch
      });

      // Create new page
      this.page = await this.browser.newPage();

      // Set viewport to exact 1920x1080 resolution
      await this.page.setViewport({
        width: this.config.viewport.width,
        height: this.config.viewport.height,
        deviceScaleFactor: 1
      });

      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set additional headers to appear more like a real browser
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      console.log('✅ Browser initialized with 1920x1080 viewport');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error.message);
      return false;
    }
  }

  /**
   * Capture screenshot of a single TradingView chart
   * @param {string} symbol - Cryptocurrency symbol (e.g., 'BTC')
   * @param {string} outputPath - Output file path
   * @returns {Object} Result object with success status and details
   */
  async captureChart(symbol, outputPath) {
    if (!this.page) {
      return {
        success: false,
        error: 'Browser not initialized. Call initialize() first.',
        symbol,
        outputPath
      };
    }

    const url = generateTradingViewUrl(symbol);
    console.log(`📸 Capturing ${symbol}USDT chart...`);

    try {
      // Navigate to TradingView chart with better error handling
      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded', // Changed from networkidle2 to be less strict
        timeout: this.config.timeout
      });

      // Wait for chart to load
      console.log(`⏳ Waiting for ${symbol}USDT chart to load...`);
      await new Promise(resolve => setTimeout(resolve, this.config.chartLoadDelay));

      // Wait for chart canvas to be visible
      try {
        await this.page.waitForSelector('canvas', { timeout: 10000 });
        console.log(`✅ Chart canvas found for ${symbol}USDT`);
      } catch (error) {
        console.log(`⚠️  Chart canvas not found for ${symbol}USDT, proceeding anyway...`);
      }

      // Select 1-year timeframe by clicking the "1Y" button
      await this.selectOneYearTimeframe(symbol);

      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Take screenshot
      await this.page.screenshot({
        path: outputPath,
        fullPage: false,
        type: 'png'
      });

      // Validate screenshot file
      if (existsSync(outputPath)) {
        const stats = statSync(outputPath);
        const fileSizeKB = Math.round(stats.size / 1024);
        
        console.log(`✅ Screenshot saved: ${outputPath} (${fileSizeKB} KB)`);
        
        return {
          success: true,
          symbol,
          outputPath,
          fileSize: stats.size,
          fileSizeKB,
          url
        };
      } else {
        return {
          success: false,
          error: 'Screenshot file was not created',
          symbol,
          outputPath,
          url
        };
      }

    } catch (error) {
      console.error(`❌ Failed to capture ${symbol}USDT:`, error.message);
      return {
        success: false,
        error: error.message,
        symbol,
        outputPath,
        url
      };
    }
  }

  /**
   * Capture screenshot with retry logic
   * @param {string} symbol - Cryptocurrency symbol
   * @param {string} outputPath - Output file path
   * @returns {Object} Result object
   */
  async captureChartWithRetry(symbol, outputPath) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${this.config.retries} for ${symbol}USDT`);
      
      const result = await this.captureChart(symbol, outputPath);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      if (attempt < this.config.retries) {
        console.log(`⏳ Retrying ${symbol}USDT in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return {
      success: false,
      error: `Failed after ${this.config.retries} attempts: ${lastError}`,
      symbol,
      outputPath
    };
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  /**
   * Select 1-year timeframe on TradingView
   * @param {string} symbol - Symbol being processed
   * @returns {boolean} True if timeframe was successfully selected
   */
  async selectOneYearTimeframe(symbol) {
    console.log(`📅 Selecting 1-year timeframe for ${symbol}USDT...`);
    
    try {
      // Wait a bit for the page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try multiple approaches to find and click the 1Y button
      const success = await this.page.evaluate(() => {
        // Method 1: Look for buttons with "1Y" text
        const buttons = Array.from(document.querySelectorAll('button, div, span, a'));
        const oneYearButton = buttons.find(btn => {
          const text = btn.textContent?.trim();
          return text === '1Y' || text === '1y' || text === '1 Year' || text === '1YEAR';
        });

        if (oneYearButton) {
          oneYearButton.click();
          return true;
        }

        // Method 2: Look for data attributes
        const dataSelectors = [
          '[data-name="timeframe-1Y"]',
          '[data-value="1Y"]',
          '[data-timeframe="1Y"]',
          '[data-period="1Y"]'
        ];

        for (const selector of dataSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            element.click();
            return true;
          }
        }

        // Method 3: Look for class names containing timeframe
        const classSelectors = [
          '.timeframe-1Y',
          '.timeframe-1y',
          '.period-1Y',
          '.period-1y'
        ];

        for (const selector of classSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            element.click();
            return true;
          }
        }

        // Method 4: Look in timeframe dropdown or toolbar
        const toolbar = document.querySelector('[data-name="timeframe-toolbar"], .timeframe-toolbar, .chart-toolbar');
        if (toolbar) {
          const oneYearInToolbar = toolbar.querySelector('button, div, span');
          if (oneYearInToolbar && oneYearInToolbar.textContent?.trim() === '1Y') {
            oneYearInToolbar.click();
            return true;
          }
        }

        return false;
      });

      if (success) {
        console.log(`✅ 1Y timeframe selected for ${symbol}USDT`);
        // Wait for chart to update
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } else {
        console.log(`⚠️  Could not find 1Y button for ${symbol}USDT`);
        return false;
      }

    } catch (error) {
      console.log(`⚠️  Timeframe selection failed for ${symbol}USDT: ${error.message}`);
      return false;
    }
  }

  /**
   * Get browser info
   */
  async getBrowserInfo() {
    if (!this.browser) {
      return null;
    }

    const version = await this.browser.version();
    const pages = await this.browser.pages();
    
    return {
      version,
      pageCount: pages.length,
      viewport: this.config.viewport
    };
  }
}
