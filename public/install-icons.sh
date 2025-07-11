#!/usr/bin/env bash

# This script helps install icon files for LeadFlow app
# First, save your icon images to these locations:
# - icon1.png (first image - standard icon)
# - icon2.png (second image - variant with different background)
# - icon3.png (third image - variant with different style)
# - icon4.png (large high-res version)

echo "LeadFlow Icon Installer"
echo "======================="
echo ""

# Check if source directory exists, create if not
if [ ! -d "./source-icons" ]; then
  echo "Creating source-icons directory..."
  mkdir -p ./source-icons
  echo "✅ Created source-icons directory"
  echo ""
  echo "Please copy your icon files to ./source-icons with these names:"
  echo "- icon1.png (first image - 192x192)"
  echo "- icon2.png (second image - for apple-touch-icon)"
  echo "- icon3.png (third image - 512x512)"
  echo ""
  echo "Then run this script again."
  exit 0
fi

# Check if source files exist
if [ ! -f "./source-icons/icon1.png" ] || [ ! -f "./source-icons/icon2.png" ] || [ ! -f "./source-icons/icon3.png" ]; then
  echo "❌ Error: Source icon files missing in ./source-icons/"
  echo "Please make sure you have these files:"
  echo "- ./source-icons/icon1.png"
  echo "- ./source-icons/icon2.png"
  echo "- ./source-icons/icon3.png"
  exit 1
fi

# Copy files to their destinations
echo "Installing icons..."
cp ./source-icons/icon1.png ./icon-192x192.png
echo "✅ Created icon-192x192.png"

cp ./source-icons/icon3.png ./icon-512x512.png
echo "✅ Created icon-512x512.png"

cp ./source-icons/icon2.png ./apple-touch-icon.png
echo "✅ Created apple-touch-icon.png"

# Create favicon from icon1
cp ./source-icons/icon1.png ./favicon-32x32.png
echo "✅ Created favicon-32x32.png"

echo ""
echo "Icons installed successfully! 🎉"
echo "Remember to restart your development server to see the changes."
