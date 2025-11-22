const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const logoPath = path.join(__dirname, '../src/img/logo.svg');
const faviconPath = path.join(__dirname, '../dist/favicon.png');

// Ensure dist directory exists
const distDir = path.dirname(faviconPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Convert SVG to PNG favicon (32x32 is standard favicon size)
sharp(logoPath)
  .resize(32, 32)
  .png()
  .toFile(faviconPath)
  .then(() => {
    console.log('✅ Favicon generated successfully at', faviconPath);
  })
  .catch((err) => {
    console.error('❌ Error generating favicon:', err);
    process.exit(1);
  });

