#!/bin/zsh

# LeadFlow App Icon Quality Preserver Script
# This script copies your original icon without any image manipulation
# that might degrade quality

echo "🚀 LeadFlow App Icon Quality Preserver"
echo "======================================"

# Source directory where you'll place your original high-quality icon
SOURCE_DIR="./source-icons"
mkdir -p "$SOURCE_DIR"

# Check for source image
SOURCE_IMAGE="$SOURCE_DIR/original-icon.png"
if [[ ! -f "$SOURCE_IMAGE" ]]; then
  echo "❌ Source image '$SOURCE_IMAGE' not found!"
  echo ""
  echo "Please follow these steps:"
  echo "1. Copy your high-quality PNG icon to: $(pwd)/$SOURCE_IMAGE"
  echo "2. Make sure it's at least 512x512 pixels"
  echo "3. Run this script again"
  exit 1
fi

echo "✅ Found source image: $SOURCE_IMAGE"
echo "Creating exact copies without quality loss..."

# Create icons directory if it doesn't exist
mkdir -p ./icons

# Simply copy the file instead of converting with ImageMagick
# This preserves the exact quality of your original PNG
cp "$SOURCE_IMAGE" "./icon-512x512.png"
cp "$SOURCE_IMAGE" "./icons/icon-512.png"
echo "✅ Created icon-512x512.png (direct copy, no quality loss)"

# Also preserve the original in case needed later
cp "$SOURCE_IMAGE" "./original-logo.png"
echo "✅ Preserved original as original-logo.png"

echo ""
echo "🎉 Your icon has been copied without any quality loss!"
echo "Now you need to:"
echo "1. Check that icons look correct: open icon-512x512.png to verify"
echo "2. Update your manifest.json if needed"
echo "3. Restart your development server to see the changes"
