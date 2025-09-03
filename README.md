# 🚀 BULLETPROOF USDT PAIRS DOWNLOADER

A **clean, simple, and bulletproof** Node.js utility for downloading USDT trading pairs from the CoinGecko API.

## ✨ Features

- **🔄 Rate Limiting**: Respects CoinGecko's 6-second rate limits
- **📄 Pagination**: Handles 250 pairs per page (maximum allowed)
- **🛡️ Error Handling**: Robust error handling with retry logic
- **📊 CSV Output**: Clean CSV format ready for Google Sheets
- **🚫 Zero Dependencies**: Uses only Node.js built-ins
- **⚡ Fast & Efficient**: Optimized for production use

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (uses native fetch API)
- Internet connection for CoinGecko API access

### Installation

```bash
# Clone or download the project
cd crypto-coin-strategy-builder-v6

# No dependencies to install!
# The utility uses only Node.js built-ins
```

### Usage

#### Basic Usage

```bash
# Download all available USDT pairs (up to 10 pages)
node download-usdt-pairs.js
```

#### Test Mode

```bash
# Test with limited pages (2 pages max)
node download-usdt-pairs.js --test
```

#### Custom Page Limit

```bash
# Download up to 5 pages
node download-usdt-pairs.js --max-pages=5
```

## 📊 Output

The utility generates a timestamped CSV file with the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| Symbol | Cryptocurrency symbol | BTC, ETH, USDT |
| Name | Full cryptocurrency name | Bitcoin, Ethereum, Tether |
| Price (USD) | Current price in USD | 45000.00 |
| Market Cap | Market capitalization | 850000000000 |
| Rank | Market cap ranking | 1, 2, 3 |
| 24h Volume | 24-hour trading volume | 25000000000 |
| 24h Price Change % | 24-hour price change | 2.5 |
| Circulating Supply | Currently circulating supply | 19500000 |
| Total Supply | Total supply | 21000000 |
| Max Supply | Maximum possible supply | 21000000 |

## ⚙️ Configuration

The utility uses sensible defaults but can be customized:

```javascript
const DEFAULT_CONFIG = {
  baseUrl: 'https://api.coingecko.com/api/v3',
  timeoutMs: 30000,                    // 30 second timeout
  delayBetweenRequestsMs: 6000,        // 6 second rate limit
  maxRetries: 3,                       // Retry failed requests
  maxPages: 10,                        // Maximum pages to fetch
  perPage: 250                         // Pairs per page (max allowed)
};
```

## 🔧 Rate Limiting

- **6-second delays** between requests (CoinGecko requirement)
- **Automatic enforcement** with progress indicators
- **Respectful API usage** to avoid rate limit issues

## 🛡️ Error Handling

- **Network timeouts** with configurable limits
- **API response validation** for data integrity
- **Graceful degradation** when API limits are reached
- **Detailed error messages** for troubleshooting

## 📁 File Structure

```
crypto-coin-strategy-builder-v6/
├── download-usdt-pairs.js    # Main utility (bulletproof!)
├── package.json              # Minimal package config
├── .gitignore               # Clean git ignore
└── README.md                # This documentation
```

## 🧪 Testing

The utility includes a test mode for development:

```bash
# Test with limited data
node download-usdt-pairs.js --test

# This will:
# - Limit to 2 pages maximum
# - Use same rate limiting
# - Generate smaller output file
# - Perfect for testing API connectivity
```

## 📈 Performance

- **Fast**: Downloads 250 pairs per page
- **Efficient**: Minimal memory usage
- **Scalable**: Handles thousands of pairs
- **Reliable**: Built-in retry and error handling

## 🔍 Troubleshooting

### Common Issues

1. **Network Timeout**
   - Check internet connection
   - Verify CoinGecko API status
   - Increase timeout in config if needed

2. **Rate Limiting**
   - Utility automatically handles this
   - 6-second delays are enforced
   - No manual intervention needed

3. **File Permissions**
   - Ensure write access to output directory
   - Check disk space availability

### API Status

- **CoinGecko API**: https://status.coingecko.com/
- **Rate Limits**: https://www.coingecko.com/en/api/documentation

## 🚀 Production Use

This utility is designed for production use:

- **No external dependencies** = no security vulnerabilities
- **Built-in error handling** = reliable operation
- **Rate limiting** = respectful API usage
- **CSV output** = easy integration with other tools

## 📝 License

UNLICENSED - Internal development tool

## 🤝 Contributing

This is a focused, single-purpose utility. For modifications:

1. Test thoroughly with `--test` flag
2. Verify rate limiting still works
3. Ensure CSV output remains clean
4. Test with real CoinGecko API

---

**Built for reliability. Designed for simplicity. Ready for production.** 🚀



