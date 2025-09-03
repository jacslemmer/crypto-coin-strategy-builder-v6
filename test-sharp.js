import sharp from 'sharp';
import fs from 'fs/promises';

async function testSharp() {
  try {
    console.log('Testing Sharp import...');
    console.log('Sharp version:', sharp.versions);
    
    // Test with a simple image operation
    const inputPath = 'Desktop/Crypto data Download/BTCUSDT_2025-08-27_13-08-30 before.png';
    
    if (fs.access) {
      console.log('File system access available');
    }
    
    console.log('Sharp is working correctly!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSharp();
