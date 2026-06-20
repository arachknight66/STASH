const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
if (!rawKey) {
  console.error('No key found in env');
  process.exit(1);
}

// Extract base64 part
const base64Str = rawKey
  .replace('-----BEGIN PRIVATE KEY-----', '')
  .replace('-----END PRIVATE KEY-----', '')
  .replace(/\s+/g, '');

console.log('Base64 string length:', base64Str.length);

try {
  const buffer = Buffer.from(base64Str, 'base64');
  console.log('Decoded buffer length:', buffer.length);
  // Check if it starts with the sequence tag for ASN.1 (0x30)
  console.log('Starts with ASN.1 sequence tag (0x30)?', buffer[0] === 0x30);
  
  // Let's write the buffer as a DER file to check it
  fs.writeFileSync('temp_key.der', buffer);
  console.log('Wrote temp_key.der');
} catch (err) {
  console.error('Failed to decode base64:', err);
}
