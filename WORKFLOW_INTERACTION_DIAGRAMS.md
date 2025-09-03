# 🔄 Complete Workflow Interaction Diagrams

## 📋 Overview
This document contains detailed Mermaid interaction diagrams for each of the 5 steps in the crypto strategy builder workflow. Each step represents a unique screen in the web application.

---

## 🎯 Step 1: Data Acquisition Screen
**Screen Purpose**: Fetch crypto data from CoinGecko API (250+ pairs)

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant API as CoinGecko API
    participant DB as Database
    participant FileSystem as File Storage

    User->>WebApp: Click "Fetch Crypto Data"
    WebApp->>User: Show progress dialog
    WebApp->>API: GET /coins/markets (batch 1/3)
    API-->>WebApp: 250 crypto pairs (page 1)
    WebApp->>DB: Store batch 1 data
    WebApp->>User: Update progress: 33% (250/750)
    
    Note over WebApp: Wait 2 minutes (rate limit)
    
    WebApp->>API: GET /coins/markets (batch 2/3)
    API-->>WebApp: 250 crypto pairs (page 2)
    WebApp->>DB: Store batch 2 data
    WebApp->>User: Update progress: 67% (500/750)
    
    Note over WebApp: Wait 2 minutes (rate limit)
    
    WebApp->>API: GET /coins/markets (batch 3/3)
    API-->>WebApp: 250 crypto pairs (page 3)
    WebApp->>DB: Store batch 3 data
    WebApp->>FileSystem: Export CSV file
    WebApp->>User: Show success: 750 pairs loaded
    WebApp->>User: Enable "Next: Screenshots" button
```

**Screen Elements**:
- Progress bar showing batch completion
- Real-time logging of API calls
- Success/failure indicators
- "Next: Screenshots" button (enabled after completion)

---

## 📸 Step 2: Screenshot Capture Screen
**Screen Purpose**: Process existing chart images with Python cropping (1920x1080)

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant Browser as Playwright Browser
    participant TradingView as TradingView.com
    participant FileSystem as File Storage
    participant Python as Python Cropper

    User->>WebApp: Click "Start Screenshots"
    WebApp->>User: Show screenshot progress
    WebApp->>Browser: Launch headless browser (1920x1080)
    
    loop For each crypto pair (750 pairs)
        WebApp->>Browser: Navigate to TradingView chart
        Browser->>TradingView: Load chart for {SYMBOL}USDT
        TradingView-->>Browser: Chart data loaded
        Browser->>Browser: Wait for chart rendering
        Browser->>FileSystem: Screenshot (1920x1080 PNG)
        WebApp->>Python: Validate resolution (1920x1080)
        Python-->>WebApp: Resolution OK
        WebApp->>User: Update progress: {current}/750
        Note over WebApp: Wait 8 seconds (rate limit)
    end
    
    WebApp->>User: Show success: 750 screenshots captured
    WebApp->>User: Enable "Next: Anonymization" button
```

**Screen Elements**:
- Screenshot progress bar (0-750)
- Real-time preview of captured charts
- Resolution validation status
- Failed capture retry options
- "Next: Anonymization" button

---

## 🎭 Step 3: Chart Anonymization Screen
**Screen Purpose**: Run AI analysis on anonymized charts using Gemini

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant Python as Python Anonymizer
    participant FileSystem as File Storage
    participant Gemini as Gemini AI API
    participant DB as Database

    User->>WebApp: Click "Start Anonymization"
    WebApp->>User: Show anonymization progress
    
    loop For each screenshot (750 images)
        WebApp->>Python: Load original screenshot
        Python->>Python: Remove coin names & dates
        Python->>Python: Crop to chart area only
        Python->>FileSystem: Save anonymized version
        Python->>DB: Store mapping (coin001 -> BTC)
        WebApp->>User: Update progress: {current}/750
    end
    
    WebApp->>User: Show success: 750 charts anonymized
    WebApp->>User: Enable "Next: AI Analysis" button
    
    Note over WebApp: User can preview before/after images
```

**Screen Elements**:
- Anonymization progress bar
- Before/after image preview
- Quality validation indicators
- Mapping table (coin001 -> BTC, etc.)
- "Next: AI Analysis" button

---

## 🤖 Step 4: AI Analysis Screen
**Screen Purpose**: Generate rankings and confidence scores (1-1000)

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant Gemini as Gemini AI API
    participant FileSystem as File Storage
    participant DB as Database

    User->>WebApp: Click "Start AI Analysis"
    WebApp->>User: Show AI analysis progress
    
    loop For each anonymized chart (750 images)
        WebApp->>FileSystem: Load anonymized chart
        WebApp->>Gemini: Send chart + analysis prompt
        Gemini-->>WebApp: JSON analysis result
        WebApp->>WebApp: Validate JSON schema
        WebApp->>DB: Store analysis results
        WebApp->>User: Update progress: {current}/750
        Note over WebApp: Wait 1 second (rate limit)
    end
    
    WebApp->>WebApp: Calculate rankings (1-1000)
    WebApp->>DB: Store final rankings
    WebApp->>User: Show success: 750 analyses complete
    WebApp->>User: Enable "Next: Results" button
```

**Screen Elements**:
- AI analysis progress bar
- Real-time confidence scores display
- JSON validation status
- Cost tracking (API usage)
- "Next: Results" button

---

## 📊 Step 5: Results & Strategy Screen
**Screen Purpose**: Export results and build strategies

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant DB as Database
    participant FileSystem as File Storage
    participant StrategyEngine as Strategy Builder

    User->>WebApp: View results table
    WebApp->>DB: Load ranked results (1-1000)
    WebApp->>User: Display sortable table
    
    User->>WebApp: Sort by "Top 10"
    WebApp->>User: Show top 10 cryptocurrencies
    
    User->>WebApp: Select coins for strategy
    WebApp->>User: Show strategy builder interface
    
    User->>WebApp: Enter strategy text
    WebApp->>StrategyEngine: Save strategy
    StrategyEngine->>DB: Store strategy + selected coins
    StrategyEngine->>FileSystem: Link original + cropped images
    
    User->>WebApp: Export to CSV/JSON
    WebApp->>FileSystem: Generate export files
    WebApp->>User: Download files
```

**Screen Elements**:
- Sortable results table (1-1000 ranking)
- Filter options (Top 5, 10, 20, etc.)
- Strategy text editor
- Selected coins display
- Export buttons (CSV, JSON)
- Image gallery (original + cropped)

---

## 🔄 Complete Workflow Integration

```mermaid
graph TD
    A[Step 1: Data Acquisition] --> B[Step 2: Screenshot Capture]
    B --> C[Step 3: Chart Anonymization]
    C --> D[Step 4: AI Analysis]
    D --> E[Step 5: Results & Strategy]
    
    A --> A1[CoinGecko API<br/>750 crypto pairs<br/>CSV export]
    B --> B1[TradingView Screenshots<br/>1920x1080 resolution<br/>750 images]
    C --> C1[Python Anonymization<br/>Remove text/labels<br/>750 anonymized charts]
    D --> D1[Gemini AI Analysis<br/>Confidence scores<br/>1-1000 rankings]
    E --> E1[Results Table<br/>Strategy Builder<br/>Export functionality]
    
    classDef stepBox fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef detailBox fill:#f3e5f5,stroke:#4a148c,stroke-width:1px,color:#000
    
    class A,B,C,D,E stepBox
    class A1,B1,C1,D1,E1 detailBox
```

---

## 📱 Screen Navigation Flow

```mermaid
stateDiagram-v2
    [*] --> Step1: Start Application
    Step1 --> Step2: Data Loaded
    Step2 --> Step3: Screenshots Complete
    Step3 --> Step4: Anonymization Complete
    Step4 --> Step5: AI Analysis Complete
    Step5 --> [*]: Export Complete
    
    Step1: Data Acquisition Screen<br/>- Progress bar<br/>- API status<br/>- CSV export
    Step2: Screenshot Screen<br/>- Capture progress<br/>- Resolution validation<br/>- Preview images
    Step3: Anonymization Screen<br/>- Processing progress<br/>- Before/after view<br/>- Quality check
    Step4: AI Analysis Screen<br/>- Analysis progress<br/>- Confidence scores<br/>- Cost tracking
    Step5: Results Screen<br/>- Sortable table<br/>- Strategy builder<br/>- Export options
```

---

## ✅ Implementation Requirements Summary

### Database Tables Needed:
1. `crypto_pairs` - Store CoinGecko data
2. `chart_screenshots` - Store screenshot metadata
3. `chart_mappings` - Link original to anonymized
4. `ai_analyses` - Store Gemini results
5. `strategies` - Store user strategies

### API Endpoints Needed:
1. `POST /api/data/fetch` - Trigger data acquisition
2. `POST /api/screenshots/capture` - Trigger screenshot capture
3. `POST /api/anonymize/process` - Trigger anonymization
4. `POST /api/analysis/run` - Trigger AI analysis
5. `GET /api/results` - Get ranked results
6. `POST /api/strategies` - Save user strategies

### File Storage Structure:
```
data/
├── screenshots/
│   ├── originals/
│   └── anonymized/
├── exports/
│   ├── crypto_data.csv
│   └── analysis_results.json
└── strategies/
    └── user_strategies/
```

### Frontend Components Needed:
1. `DataAcquisitionScreen` - Step 1
2. `ScreenshotCaptureScreen` - Step 2
3. `AnonymizationScreen` - Step 3
4. `AIAnalysisScreen` - Step 4
5. `ResultsScreen` - Step 5

---

**Status**: ✅ **COMPLETE** - All 5 steps are fully specified with detailed interaction diagrams and implementation requirements.


