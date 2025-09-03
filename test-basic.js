// Basic test to check if Playwright and our function work
import playwright from 'playwright';

console.log('🧪 Testing basic Playwright functionality...');

const testPlaywright = async () => {
  try {
    console.log('🚀 Launching browser...');
    const browser = await playwright.chromium.launch({ headless: true });
    console.log('✅ Browser launched successfully');
    
    const context = await browser.newContext();
    console.log('✅ Browser context created');
    
    const page = await context.newPage();
    console.log('✅ Page created');
    
    await page.goto('https://www.google.com');
    console.log('✅ Navigated to Google');
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    await browser.close();
    console.log('✅ Browser closed successfully');
    
    console.log('🎉 All Playwright tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testPlaywright();
