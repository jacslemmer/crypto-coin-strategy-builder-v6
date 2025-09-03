# 📁 MVP Storage Specification (Node.js CLI App)

## 🎯 **Overview**
This document defines the local computer storage structure for the MVP prototype. This is a **plain TypeScript Node.js command-line application** for the **top 100 USDT pairs only**. All developers must follow this exact folder structure and naming conventions to ensure consistency across the development team.

---

## 🏗️ **Root Storage Structure**

```
crypto-coin-strategy-builder-v5/
├── data/                          # Main data storage directory
│   ├── crypto-pairs/             # Cryptocurrency pair data (100 pairs)
│   ├── screenshots/              # TradingView chart screenshots (100 charts)
│   ├── anonymized-charts/        # Processed anonymized charts (100 charts)
│   ├── ai-analysis/              # AI analysis results (100 analyses)
│   ├── strategies/               # User-created strategies
│   └── exports/                  # Generated export files
├── logs/                         # Application logs
├── temp/                         # Temporary processing files
├── config/                       # Configuration files
└── src/                          # TypeScript Node.js source code
    ├── cli/                      # Command-line interface
    ├── services/                 # Core services
    ├── storage/                  # File storage utilities
    └── utils/                    # Utility functions
```

---

## 📊 **Detailed Storage Specifications**

### **1. Crypto Pairs Data Storage**
**Location**: `data/crypto-pairs/`

```
data/crypto-pairs/
├── raw/                          # Raw API responses
│   ├── coingecko/
│   │   ├── batch_001_2024-01-15T10-30-00.json
│   │   ├── batch_002_2024-01-15T10-32-00.json
│   │   └── batch_003_2024-01-15T10-34-00.json
│   └── metadata/
│       ├── api_calls_log.json
│       └── rate_limit_status.json
├── processed/                    # Processed and validated data
│   ├── crypto_pairs_2024-01-15T10-35-00.csv
│   ├── crypto_pairs_2024-01-15T10-35-00.json
│   └── validation_report.json
└── database/                     # Database files (if using local DB)
    ├── crypto_pairs.db
    └── migrations/
```

**File Naming Convention**:
- Raw API responses: `batch_{number}_{timestamp}.json`
- Processed data: `crypto_pairs_{timestamp}.csv/json`
- Timestamp format: `YYYY-MM-DDTHH-MM-SS`

### **2. Screenshot Storage**
**Location**: `data/screenshots/`

```
data/screenshots/
├── originals/                    # Original TradingView screenshots
│   ├── 2024-01-15T10-40-00/     # Timestamp-based batch folders
│   │   ├── BTCUSDT_2024-01-15T10-40-15.png
│   │   ├── ETHUSDT_2024-01-15T10-40-23.png
│   │   ├── ADAUSDT_2024-01-15T10-40-31.png
│   │   └── ...
│   └── 2024-01-15T11-20-00/     # Next batch
├── metadata/                     # Screenshot metadata
│   ├── screenshot_log.json
│   ├── resolution_validation.json
│   └── failed_screenshots.json
└── temp/                         # Temporary processing files
    ├── browser_cache/
    └── processing_queue.json
```

**File Naming Convention**:
- Screenshots: `{SYMBOL}USDT_{timestamp}.png`
- Batch folders: `{timestamp}` (YYYY-MM-DDTHH-MM-SS)
- Resolution: **EXACTLY 1920x1080** (validated and logged)

### **3. Anonymized Charts Storage**
**Location**: `data/anonymized-charts/`

```
data/anonymized-charts/
├── processed/                    # Anonymized chart images
│   ├── 2024-01-15T10-45-00/     # Processing batch timestamp
│   │   ├── coin001_anon.png     # BTC anonymized
│   │   ├── coin002_anon.png     # ETH anonymized
│   │   ├── coin003_anon.png     # ADA anonymized
│   │   └── ...
├── mappings/                     # Original to anonymized mapping
│   ├── chart_mappings_2024-01-15T10-45-00.json
│   └── mapping_validation.json
└── quality_reports/              # Anonymization quality reports
    ├── quality_report_2024-01-15T10-45-00.json
    └── failed_anonymizations.json
```

**File Naming Convention**:
- Anonymized charts: `coin{number}_anon.png`
- Mapping files: `chart_mappings_{timestamp}.json`
- Anonymous ID format: `coin001`, `coin002`, `coin003`, etc.

### **4. AI Analysis Storage**
**Location**: `data/ai-analysis/`

```
data/ai-analysis/
├── raw_responses/                # Raw AI API responses
│   ├── gemini/
│   │   ├── coin001_2024-01-15T10-50-00.json
│   │   ├── coin002_2024-01-15T10-50-05.json
│   │   └── ...
│   ├── chatgpt/                  # Future integration
│   └── grok/                     # Future integration
├── processed/                    # Processed analysis results
│   ├── analysis_results_2024-01-15T10-55-00.json
│   ├── rankings_2024-01-15T10-55-00.csv
│   └── confidence_scores.json
├── validation/                   # JSON schema validation results
│   ├── validation_report.json
│   └── failed_validations.json
└── cost_tracking/                # API cost tracking
    ├── gemini_costs.json
    └── total_costs_summary.json
```

**File Naming Convention**:
- Raw responses: `coin{number}_{timestamp}.json`
- Results: `analysis_results_{timestamp}.json`
- Rankings: `rankings_{timestamp}.csv`

### **5. Strategies Storage**
**Location**: `data/strategies/`

```
data/strategies/
├── user_strategies/              # User-created strategies
│   ├── strategy_001_2024-01-15T11-00-00.json
│   ├── strategy_002_2024-01-15T11-05-00.json
│   └── ...
├── templates/                    # Strategy templates
│   ├── high_confidence_trend.json
│   ├── conservative_approach.json
│   └── aggressive_growth.json
├── performance/                  # Strategy performance tracking
│   ├── performance_001_2024-01-15T11-00-00.json
│   └── historical_performance.json
└── exports/                      # Strategy export files
    ├── strategies_export_2024-01-15T11-10-00.csv
    └── strategies_export_2024-01-15T11-10-00.json
```

### **6. Export Files Storage**
**Location**: `data/exports/`

```
data/exports/
├── csv/                          # CSV export files
│   ├── crypto_pairs_export_2024-01-15T11-15-00.csv
│   ├── rankings_export_2024-01-15T11-15-00.csv
│   └── strategies_export_2024-01-15T11-15-00.csv
├── json/                         # JSON export files
│   ├── complete_analysis_2024-01-15T11-15-00.json
│   └── workflow_state_2024-01-15T11-15-00.json
├── pdf/                          # PDF reports (future)
└── images/                       # Image exports
    ├── chart_comparisons/
    └── strategy_visualizations/
```

### **7. Logs Storage**
**Location**: `logs/`

```
logs/
├── application/                  # Application logs
│   ├── app_2024-01-15.log
│   ├── error_2024-01-15.log
│   └── debug_2024-01-15.log
├── api/                          # API call logs
│   ├── coingecko_2024-01-15.log
│   ├── tradingview_2024-01-15.log
│   └── gemini_2024-01-15.log
├── processing/                   # Processing logs
│   ├── screenshot_processing.log
│   ├── anonymization_processing.log
│   └── ai_analysis_processing.log
└── workflow/                     # Workflow step logs
    ├── step1_data_acquisition.log
    ├── step2_screenshot_capture.log
    ├── step3_anonymization.log
    ├── step4_ai_analysis.log
    └── step5_results.log
```

### **8. Temporary Files Storage**
**Location**: `temp/`

```
temp/
├── processing/                   # Temporary processing files
│   ├── image_processing/
│   ├── data_processing/
│   └── ai_processing/
├── cache/                        # Application cache
│   ├── api_cache/
│   ├── image_cache/
│   └── analysis_cache/
└── cleanup/                      # Files marked for cleanup
    ├── old_screenshots/
    └── expired_data/
```

### **9. Configuration Storage**
**Location**: `config/`

```
config/
├── api_keys.json                 # API keys (gitignored)
├── settings.json                 # Application settings
├── workflow_config.json          # Workflow configuration
├── storage_config.json           # Storage configuration
└── validation_schemas/           # JSON validation schemas
    ├── crypto_pair_schema.json
    ├── ai_response_schema.json
    └── strategy_schema.json
```

---

## 🔧 **Storage Configuration**

### **Environment Variables**
```bash
# Storage paths
DATA_ROOT_PATH=./data
LOGS_ROOT_PATH=./logs
TEMP_ROOT_PATH=./temp
CONFIG_ROOT_PATH=./config

# File size limits
MAX_SCREENSHOT_SIZE=5MB
MAX_BATCH_SIZE=250
MAX_LOG_FILE_SIZE=10MB

# Retention policies
SCREENSHOT_RETENTION_DAYS=30
LOG_RETENTION_DAYS=7
TEMP_FILE_RETENTION_HOURS=24
```

### **Storage Validation**
```javascript
// Example storage validation function
const validateStorageStructure = () => {
  const requiredDirs = [
    'data/crypto-pairs/raw',
    'data/crypto-pairs/processed',
    'data/screenshots/originals',
    'data/anonymized-charts/processed',
    'data/ai-analysis/raw_responses',
    'data/strategies/user_strategies',
    'data/exports/csv',
    'logs/application',
    'temp/processing'
  ];
  
  // Validate all directories exist
  // Create if missing
  // Set proper permissions
};
```

---

## 📋 **Developer Guidelines**

### **File Access Patterns**
1. **Read Operations**: Always check if file exists before reading
2. **Write Operations**: Create directory structure if missing
3. **Cleanup**: Implement automatic cleanup for temp files
4. **Permissions**: Set appropriate file permissions (644 for files, 755 for directories)

### **Error Handling**
```javascript
// Example error handling for storage operations
const safeFileOperation = async (operation) => {
  try {
    await ensureDirectoryExists(path.dirname(filePath));
    return await operation();
  } catch (error) {
    logError('Storage operation failed', { filePath, error });
    throw new StorageError(`Failed to ${operation.name}: ${error.message}`);
  }
};
```

### **Performance Considerations**
- Use streaming for large files
- Implement file compression for old data
- Use async I/O operations
- Cache frequently accessed metadata

---

## 🚨 **Critical Requirements**

### **Resolution Validation**
- **ALL screenshots MUST be exactly 1920x1080**
- Validation must occur immediately after capture
- Failed validations must be logged and retried
- No exceptions to this requirement

### **Data Integrity**
- All files must have checksums for validation
- Backup critical data before processing
- Implement rollback mechanisms for failed operations
- Maintain audit trails for all operations

### **Security**
- API keys must be stored in `config/api_keys.json` (gitignored)
- Sensitive data must be encrypted at rest
- Implement proper file permissions
- Regular security audits of stored data

---

## 📝 **Quick Reference**

### **Common File Paths**
```javascript
// Crypto pairs data
const cryptoPairsPath = './data/crypto-pairs/processed/crypto_pairs_2024-01-15T10-35-00.csv';

// Screenshot path
const screenshotPath = './data/screenshots/originals/2024-01-15T10-40-00/BTCUSDT_2024-01-15T10-40-15.png';

// Anonymized chart path
const anonymizedPath = './data/anonymized-charts/processed/2024-01-15T10-45-00/coin001_anon.png';

// AI analysis results
const analysisPath = './data/ai-analysis/processed/analysis_results_2024-01-15T10-55-00.json';

// Strategy file
const strategyPath = './data/strategies/user_strategies/strategy_001_2024-01-15T11-00-00.json';
```

### **Storage Utilities**
```javascript
// Utility functions for storage operations
const storageUtils = {
  ensureDir: (path) => fs.mkdirSync(path, { recursive: true }),
  getTimestamp: () => new Date().toISOString().replace(/[:.]/g, '-'),
  validateResolution: (imagePath) => { /* 1920x1080 validation */ },
  cleanupTemp: () => { /* Clean old temp files */ }
};
```

---

## ✅ **Implementation Checklist**

- [ ] Create all required directory structures
- [ ] Implement file naming conventions
- [ ] Set up logging configuration
- [ ] Configure API key storage (gitignored)
- [ ] Implement storage validation functions
- [ ] Set up automatic cleanup processes
- [ ] Test all storage operations
- [ ] Document any custom storage requirements
- [ ] Implement backup and recovery procedures

---

**Status**: ✅ **READY FOR IMPLEMENTATION** - All developers must follow this storage specification exactly to ensure consistency and proper data management across the MVP prototype. This is a **plain TypeScript Node.js command-line application** for the **top 100 USDT pairs only**.
