// Simple Sharp test
import sharp from 'sharp';

console.log('🔍 Testing Sharp import...');
console.log('Sharp type:', typeof sharp);
console.log('Sharp constructor:', sharp.constructor.name);

try {
  // Try to create a simple sharp instance
  const testImage = sharp();
  console.log('✅ Sharp is working correctly');
} catch (error) {
  console.log('❌ Sharp error:', error.message);
}
