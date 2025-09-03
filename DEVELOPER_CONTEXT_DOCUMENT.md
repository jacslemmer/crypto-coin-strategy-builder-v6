# 📋 Developer Context Document

## 🎯 **What This Workflow Does (Beginning to End)**

The Crypto Coin Strategy Builder V5 is a comprehensive 5-step workflow application that transforms raw cryptocurrency market data into actionable trading strategies through AI-powered analysis. The process begins by fetching the top 750 cryptocurrency pairs from CoinGecko API, capturing 12-month daily candlestick charts from TradingView at exactly 1920x1080 resolution, anonymizing these charts by removing coin identifiers and time references, analyzing the anonymized charts using Gemini AI to generate confidence scores and rankings (1-1000), and finally presenting the results in a sortable table where users can filter top performers, create trading strategies using a text editor, and export their analysis with both original and anonymized chart references.

The existing codebase provides a solid foundation with three core components already functional: `download-usdt-pairs.js` handles CoinGecko API integration with proper rate limiting and CSV export, `trend-analysis-v3.js` provides working Gemini AI integration with strict JSON schema validation and ranking algorithms, and `batch-crop-usdt-pairs.py` handles image processing (now updated to `batch-crop-usdt-pairs-v2.py` for 1920x1080 resolution). The new workflow adds TradingView screenshot automation (`tradingview-chart-fetcher.ts`), enhanced anonymization processing, and a complete React TypeScript web application with 5 dedicated screens that guide users through each step with real-time progress tracking, error handling, and seamless data flow between components.

---

## 🔧 **Technical Architecture & Integration Points**

The application follows a microservices architecture where each step operates as an independent service with clear data contracts: Step 1 (Data Acquisition) outputs structured crypto pair data to the database, Step 2 (Screenshot Capture) produces 1920x1080 PNG files with strict resolution validation, Step 3 (Anonymization) transforms original screenshots into anonymized versions while maintaining mapping relationships, Step 4 (AI Analysis) processes anonymized charts through Gemini AI and generates ranked confidence scores, and Step 5 (Results & Strategy) provides the user interface for viewing results, building strategies, and exporting data. The workflow ensures data integrity through validation at each step, with the 1920x1080 resolution requirement being non-negotiable for proper cropping and AI analysis functionality.

The existing code components integrate seamlessly with the new workflow: the CoinGecko integration provides the foundation for Step 1, the Gemini AI analysis forms the core of Step 4, and the Python image processing supports Step 3. New components include React TypeScript screens for each workflow step, WebSocket-based real-time progress tracking, database integration for state persistence, and comprehensive error handling with retry mechanisms. The final application delivers a complete end-to-end experience from raw crypto data to actionable trading strategies, with all intermediate steps properly validated and documented for production deployment.


