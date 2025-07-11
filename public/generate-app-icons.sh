#!/bin/zsh

# LeadFlow App Icon Generator Script
# This script uses ImageMagick to generate all required icons for the LeadFlow app

echo "🚀 LeadFlow App Icon Generator"
echo "=============================="

# Check for source image
SOURCE_IMAGE="original-logo.png"
if [[ ! -f "$SOURCE_IMAGE" ]]; then
  echo "❌ Source image '$SOURCE_IMAGE' not found!"
  echo "Please copy the LeadFlow logo image to $(pwd)/$SOURCE_IMAGE"
  exit 1
fi

echo "✅ Found source image: $SOURCE_IMAGE"
echo "Generating app icons..."

# Generate icon-512x512.png
convert "$SOURCE_IMAGE" -resize 512x512 -background "#151621" -gravity center -extent 512x512 icon-512x512.png
echo "✅ Created icon-512x512.png"

# Generate icon-192x192.png
convert "$SOURCE_IMAGE" -resize 192x192 -background "#151621" -gravity center -extent 192x192 icon-192x192.png
echo "✅ Created icon-192x192.png"

# Generate apple-touch-icon.png
convert "$SOURCE_IMAGE" -resize 180x180 -background "#151621" -gravity center -extent 180x180 apple-touch-icon.png
echo "✅ Created apple-touch-icon.png"

# Generate favicon-32x32.png
convert "$SOURCE_IMAGE" -resize 32x32 -background "#151621" -gravity center -extent 32x32 favicon-32x32.png
echo "✅ Created favicon-32x32.png"

# Generate favicon.ico with multiple sizes
convert "$SOURCE_IMAGE" -resize 16x16 -background "#151621" -gravity center -extent 16x16 \
  "$SOURCE_IMAGE" -resize 32x32 -background "#151621" -gravity center -extent 32x32 \
  "$SOURCE_IMAGE" -resize 48x48 -background "#151621" -gravity center -extent 48x48 \
  -colors 256 favicon.ico
echo "✅ Created favicon.ico (multi-size)"

echo ""
echo "🎉 All icons generated successfully!"
echo "Restart your development server to see the changes."
