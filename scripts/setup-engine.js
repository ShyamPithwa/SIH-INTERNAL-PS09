const fs = require('fs');
const path = require('path');
const https = require('https');

const TARGET_DIR = path.join(__dirname, '../engine/include/nlohmann');
const TARGET_FILE = path.join(TARGET_DIR, 'json.hpp');
const DOWNLOAD_URL = 'https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp';

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function downloadFile(url, dest) {
  console.log(`Downloading ${url} to ${dest}...`);
  ensureDirectoryExistence(dest);
  const file = fs.createWriteStream(dest);

  https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
      // Follow redirect
      downloadFile(response.headers.location, dest);
      return;
    }
    
    if (response.statusCode !== 200) {
      console.error(`Failed to download JSON library. Status code: ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('Download complete!');
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`Error downloading file: ${err.message}`);
    process.exit(1);
  });
}

if (!fs.existsSync(TARGET_FILE)) {
  downloadFile(DOWNLOAD_URL, TARGET_FILE);
} else {
  console.log('nlohmann/json.hpp already exists.');
}
