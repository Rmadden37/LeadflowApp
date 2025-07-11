// Script to generate icons for LeadFlow app
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Icon configurations
const iconConfigs = [
  { name: 'icon-512x512.png', width: 512, height: 512, sourceIdx: 2 }, // 3rd image for high-res
  { name: 'icon-192x192.png', width: 192, height: 192, sourceIdx: 0 }, // 1st image for standard
  { name: 'apple-touch-icon.png', width: 180, height: 180, sourceIdx: 1 }, // 2nd image for Apple
  { name: 'favicon-32x32.png', width: 32, height: 32, sourceIdx: 0 } // 1st image for favicon
];

// Source image paths - you'll need to update these
const sourcePaths = [
  path.join(__dirname, 'source-icons', 'icon1.png'), // 1st provided image
  path.join(__dirname, 'source-icons', 'icon2.png'), // 2nd provided image
  path.join(__dirname, 'source-icons', 'icon3.png')  // 3rd provided image
];

// Ensure source icons directory exists
const sourceDir = path.join(__dirname, 'source-icons');
if (!fs.existsSync(sourceDir)) {
  fs.mkdirSync(sourceDir);
  console.log('Created source-icons directory. Please place your icon images there with names icon1.png, icon2.png, icon3.png');
  process.exit(1);
}

async function generateIcons() {
  try {
    // Load source images
    const sourceImages = await Promise.all(
      sourcePaths.map(async (path) => {
        try {
          return await loadImage(path);
        } catch (err) {
          console.error(`Error loading image at ${path}. Make sure it exists.`);
          throw err;
        }
      })
    );

    // Generate each icon
    for (const config of iconConfigs) {
      console.log(`Generating ${config.name}...`);
      
      const canvas = createCanvas(config.width, config.height);
      const ctx = canvas.getContext('2d');
      
      // Get the source image for this icon
      const sourceImage = sourceImages[config.sourceIdx];
      
      // Draw the image scaled properly
      const scale = Math.min(config.width / sourceImage.width, config.height / sourceImage.height);
      const x = (config.width - sourceImage.width * scale) / 2;
      const y = (config.height - sourceImage.height * scale) / 2;
      
      ctx.drawImage(sourceImage, x, y, sourceImage.width * scale, sourceImage.height * scale);
      
      // Save the output
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(__dirname, config.name), buffer);
      
      console.log(`✅ ${config.name} created!`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
