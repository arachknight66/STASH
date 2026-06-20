const fs = require('fs');
const der = fs.readFileSync('temp_key.der');

console.log('DER Length:', der.length);
console.log('First 10 bytes:', der.slice(0, 10));

// Let's check the length of the main SEQUENCE
if (der[0] === 0x30) {
  let len = 0;
  if (der[1] & 0x80) {
    const numBytes = der[1] & 0x7F;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | der[2 + i];
    }
    const headerLen = 2 + numBytes;
    console.log(`Main SEQUENCE specifies length: ${len}, header length: ${headerLen}`);
    console.log(`Total expected bytes: ${headerLen + len}`);
    console.log(`Actual bytes matches expected?`, der.length === headerLen + len);
  } else {
    len = der[1];
    console.log(`Main SEQUENCE specifies short length: ${len}`);
  }
}
