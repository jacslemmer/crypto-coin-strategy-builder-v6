import { fetchTradingViewChart, createDefaultConfig } from './dist/tradingview-chart-fetcher.js';

// Simple test to verify the function works
const testFunction = async () => {
  console.log('🧪 Testing TradingView Chart Fetcher (Compiled Version)...');
  
  // Create a test configuration for SOLUSDT in headless mode
  const config = createDefaultConfig('SOLUSDT', 'test_sol_chart.png', true); // true = headless mode
  
  console.log('📋 Test configuration:', config);
  
  try {
    console.log('🚀 Starting test...');
    const result = await fetchTradingViewChart(config);
    
    if (result.success) {
      console.log('✅ Test successful!');
      console.log('📊 Chart metadata:', result.metadata);
      console.log('📁 Output saved to:', result.outputPath);
    } else {
      console.error('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('💥 Test crashed:', error);
  }
  
  console.log('🏁 Test completed');
};

// Run the test
testFunction().catch(console.error);
