const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('extracted_creds.json', 'utf-8'));
const rawKey = creds.private_key;

// Escape newlines as \n
const escapedKey = rawKey.replace(/\n/g, '\\n');

console.log('Escaped key length:', escapedKey.length);
console.log('Formatted key:');
console.log(escapedKey);
