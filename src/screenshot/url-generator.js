/**
 * TradingView URL Generator
 * 
 * Generates TradingView chart URLs for cryptocurrency pairs
 */

/**
 * Generate TradingView URL for a cryptocurrency pair
 * @param {string} symbol - The cryptocurrency symbol (e.g., 'BTC', 'ETH')
 * @param {string} interval - Chart interval (default: '1D' for daily)
 * @param {string} timeframe - Chart timeframe (default: '12M' for 12 months)
 * @returns {string} TradingView chart URL
 */
export function generateTradingViewUrl(symbol, interval = '1D', timeframe = '12M') {
  // Convert symbol to uppercase and add USDT
  const pairSymbol = `${symbol.toUpperCase()}USDT`;
  
  // TradingView URL format
  const baseUrl = 'https://www.tradingview.com/chart/';
  const params = new URLSearchParams({
    symbol: pairSymbol,
    interval: interval,
    timeframe: timeframe
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate URLs for multiple cryptocurrency pairs
 * @param {Array} symbols - Array of cryptocurrency symbols
 * @param {string} interval - Chart interval (default: '1D')
 * @param {string} timeframe - Chart timeframe (default: '12M')
 * @returns {Array} Array of objects with symbol and URL
 */
export function generateTradingViewUrls(symbols, interval = '1D', timeframe = '12M') {
  return symbols.map(symbol => ({
    symbol: symbol.toUpperCase(),
    pair: `${symbol.toUpperCase()}USDT`,
    url: generateTradingViewUrl(symbol, interval, timeframe),
    interval,
    timeframe
  }));
}

/**
 * Validate TradingView URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid TradingView chart URL
 */
export function validateTradingViewUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.tradingview.com' && 
           urlObj.pathname === '/chart/' &&
           urlObj.searchParams.has('symbol') &&
           urlObj.searchParams.has('interval');
  } catch (error) {
    return false;
  }
}

/**
 * Extract symbol from TradingView URL
 * @param {string} url - TradingView URL
 * @returns {string|null} Extracted symbol or null if invalid
 */
export function extractSymbolFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const symbol = urlObj.searchParams.get('symbol');
    if (symbol && symbol.endsWith('USDT')) {
      return symbol.replace('USDT', '');
    }
    return null;
  } catch (error) {
    return null;
  }
}




