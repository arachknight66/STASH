const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const envKey = process.env.FIREBASE_PRIVATE_KEY;
const jsonKey = JSON.parse(fs.readFileSync('extracted_creds.json', 'utf-8')).private_key;

console.log('Env Key Length:', envKey ? envKey.length : 'undefined');
console.log('JSON Key Length:', jsonKey ? jsonKey.length : 'undefined');

if (envKey === jsonKey) {
  console.log('✅ Keys are identical in memory!');
} else {
  console.log('❌ Keys differ!');
  const limit = Math.min(envKey.length, jsonKey.length);
  for (let i = 0; i < limit; i++) {
    if (envKey[i] !== jsonKey[i]) {
      console.log(`Difference at index ${i}:`);
      console.log(`Env key char code: ${envKey.charCodeAt(i)} (${JSON.stringify(envKey[i])})`);
      console.log(`JSON key char code: ${jsonKey.charCodeAt(i)} (${JSON.stringify(jsonKey[i])})`);
      break;
    }
  }
}
