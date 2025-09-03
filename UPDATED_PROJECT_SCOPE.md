# 🔄 Updated Project Scope - Node.js CLI Application

## 🎯 **Scope Change Summary**
**Previous Scope**: Web application with React frontend for 1000 USDT pairs  
**New Scope**: Plain TypeScript Node.js command-line application for top 100 USDT pairs only

---

## 📋 **Updated Requirements**

### **Application Type**
- ❌ **REMOVED**: Web application with React frontend
- ✅ **NEW**: Plain TypeScript Node.js command-line application
- ✅ **NEW**: CLI-based workflow execution
- ✅ **NEW**: Terminal-based user interface

### **Data Scope**
- ❌ **REMOVED**: 1000 USDT pairs
- ✅ **NEW**: Top 100 USDT pairs only
- ✅ **NEW**: Single batch processing (100 pairs)
- ✅ **NEW**: Simplified data management

### **User Interface**
- ❌ **REMOVED**: React web interface
- ❌ **REMOVED**: Browser-based screens
- ❌ **REMOVED**: WebSocket real-time updates
- ✅ **NEW**: Command-line interface with Commander.js
- ✅ **NEW**: Interactive prompts with Inquirer.js
- ✅ **NEW**: Colored output with Chalk.js
- ✅ **NEW**: Progress bars with cli-progress

---

## 🏗️ **Updated Architecture**

### **Technology Stack**
- **Frontend**: ❌ Removed (no web interface)
- **Backend**: TypeScript Node.js (CLI application)
- **Database**: Local JSON/CSV files (no database)
- **Deployment**: Local execution only
- **Storage**: Local file system

### **Core Components**
1. **CLI Interface**: Command-line workflow execution
2. **Data Services**: CoinGecko API integration
3. **Screenshot Service**: TradingView automation
4. **Image Processing**: Python anonymization
5. **AI Analysis**: Gemini API integration
6. **File Storage**: Local JSON/CSV management

---

## 📝 **Updated Workflow**

### **CLI Commands**
```bash
# Complete workflow
npm run workflow-start

# Individual steps
npm run step1-fetch-data
npm run step2-capture-screenshots
npm run step3-anonymize-charts
npm run step4-ai-analysis
npm run step5-results-strategy

# Data management
npm run list-pairs
npm run search-pair <symbol>
npm run export-data <format>

# Strategy management
npm run create-strategy
npm run list-strategies
npm run test-strategy <name>
```

### **Workflow Steps**
1. **Step 1**: Fetch top 100 USDT pairs from CoinGecko
2. **Step 2**: Capture TradingView screenshots (1920x1080)
3. **Step 3**: Anonymize charts (remove coin identifiers)
4. **Step 4**: AI analysis with Gemini
5. **Step 5**: Results display and strategy creation

---

## 📊 **Updated EPICs and Stories**

### **6 EPICs Updated**
1. **Data Acquisition System** - Top 100 pairs, CLI interface
2. **Chart Screenshot System** - Top 100 pairs, CLI interface
3. **Chart Anonymization System** - Top 100 pairs, CLI interface
4. **AI Analysis Engine** - Top 100 pairs, CLI interface
5. **Command-Line Interface System** - CLI workflow management
6. **Strategy Management System** - CLI-based strategy creation

### **16 User Stories Updated**
- All stories updated for CLI interface
- Reduced scope to top 100 USDT pairs
- Local file storage instead of database
- Command-line execution instead of web interface

---

## 🗂️ **Updated Storage Structure**

### **Local File Organization**
```
crypto-coin-strategy-builder-v5/
├── data/                          # Main data storage
│   ├── crypto-pairs/             # 100 USDT pairs
│   ├── screenshots/              # 100 chart screenshots
│   ├── anonymized-charts/        # 100 anonymized charts
│   ├── ai-analysis/              # 100 AI analyses
│   ├── strategies/               # User strategies
│   └── exports/                  # Export files
├── src/                          # TypeScript source
│   ├── cli/                      # CLI commands
│   ├── services/                 # Core services
│   ├── storage/                  # File utilities
│   └── utils/                    # Utilities
├── logs/                         # Application logs
├── temp/                         # Temporary files
└── config/                       # Configuration
```

---

## ⚡ **Implementation Benefits**

### **Simplified Development**
- No web framework complexity
- No database setup required
- No deployment configuration
- Faster development cycle

### **Reduced Scope**
- 100 pairs instead of 1000
- Single batch processing
- Local file storage
- Command-line interface

### **Maintained Functionality**
- All core workflow steps preserved
- AI analysis capabilities intact
- Strategy creation functionality
- Export capabilities maintained

---

## 🚀 **Ready for Development**

**Status**: ✅ **UPDATED AND READY** - All EPICs, Stories, and specifications have been updated to reflect the new scope:

- **Plain TypeScript Node.js command-line application**
- **Top 100 USDT pairs only**
- **CLI-based workflow execution**
- **Local file storage**
- **No web interface**

The development team can now proceed with the updated specifications and begin implementation of the CLI-based workflow application.


