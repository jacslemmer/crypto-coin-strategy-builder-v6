/**
 * Archived on 2025-09-03: Previous URL generator (direct USDT pair, no ETH normalization)
 */

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
  const pairSymbol = `${symbol.toUpperCase()}USDT`;
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

export function validateTradingViewUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.tradingview.com' && 
           urlObj.pathname === '/chart/' &&
           urlObj.searchParams.has('symbol') &&
           urlObj.searchParams.has('interval');
  } catch {
    return false;
  }
}

export function extractSymbolFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const symbol = urlObj.searchParams.get('symbol');
    if (symbol && symbol.endsWith('USDT')) {
      return symbol.replace('USDT', '');
    }
    return null;
  } catch {
    return null;
  }
}


