const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = 'C:/Users/arach/.gemini/antigravity-ide/brain/e3d62981-d521-4c84-bd4b-38fcd4525676/.system_generated/logs/transcript.jsonl';

async function extract() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('service_account') && line.includes('stash-5669f')) {
      try {
        const obj = JSON.parse(line);
        if (obj.content && obj.content.includes('service_account')) {
          console.log('Found in content! Parsing content...');
          const content = obj.content;
          const startIdx = content.indexOf('{');
          const endIdx = content.lastIndexOf('}');
          if (startIdx !== -1 && endIdx !== -1) {
            const jsonStr = content.substring(startIdx, endIdx + 1);
            try {
              const creds = JSON.parse(jsonStr);
              console.log('✅ Successfully extracted credentials!');
              console.log('Project ID:', creds.project_id);
              console.log('Client Email:', creds.client_email);
              console.log('Private key length:', creds.private_key ? creds.private_key.length : 0);
              fs.writeFileSync('extracted_creds.json', JSON.stringify(creds, null, 2));
              console.log('Saved to extracted_creds.json');
              return;
            } catch (e) {
              console.error('Failed to parse substring JSON:', e.message);
            }
          }
        }
      } catch (e) {
        // Line parsing failed
      }
    }
  }
  console.log('Finished searching.');
}

extract();
