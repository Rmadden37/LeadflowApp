#!/bin/zsh

# Icon Quality Verification Script
# This script verifies that icons haven't been corrupted during the build process

echo "🔍 LeadFlow Icon Quality Verification"
echo "===================================="

# Original source image
SOURCE_DIR="./public/source-icons"
SOURCE_IMAGE="$SOURCE_DIR/original-icon.png"

# Built icon in dist directory
BUILT_ICON="./dist/icon-512x512.png"

if [[ ! -f "$SOURCE_IMAGE" ]]; then
  echo "❌ Source image not found at $SOURCE_IMAGE"
  echo "Please run the preserve-icon-quality.sh script first"
  exit 1
fi

if [[ ! -f "$BUILT_ICON" ]]; then
  echo "❌ Built icon not found at $BUILT_ICON"
  echo "Please build the project first with 'npm run build'"
  exit 1
fi

# Calculate file sizes
SOURCE_SIZE=$(stat -f %z "$SOURCE_IMAGE")
BUILT_SIZE=$(stat -f %z "$BUILT_ICON")

echo "Source icon size: $SOURCE_SIZE bytes"
echo "Built icon size:  $BUILT_SIZE bytes"

# Calculate file hash to compare content
SOURCE_HASH=$(shasum -a 256 "$SOURCE_IMAGE" | cut -d' ' -f1)
BUILT_HASH=$(shasum -a 256 "$BUILT_ICON" | cut -d' ' -f1)

echo ""
echo "Source icon hash: $SOURCE_HASH"
echo "Built icon hash:  $BUILT_HASH"

# Check if files are identical
if [[ "$SOURCE_HASH" == "$BUILT_HASH" ]]; then
  echo ""
  echo "✅ VERIFICATION PASSED: Icons are identical!"
else
  echo ""
  echo "❌ VERIFICATION FAILED: Icons are different!"
  
  # Calculate percentage of size difference
  if [[ $SOURCE_SIZE -gt $BUILT_SIZE ]]; then
    DIFF=$((($SOURCE_SIZE - $BUILT_SIZE) * 100 / $SOURCE_SIZE))
    echo "Built icon is $DIFF% smaller than source"
  else
    DIFF=$((($BUILT_SIZE - $SOURCE_SIZE) * 100 / $SOURCE_SIZE))
    echo "Built icon is $DIFF% larger than source"
  fi
  
  echo ""
  echo "Possible causes:"
  echo "1. Image processing during build (compression, optimization)"
  echo "2. Format conversion"
  echo "3. Metadata changes"
  
  echo ""
  echo "Recommendations:"
  echo "- Check the built icon visually to confirm if it's corrupted"
  echo "- Follow the instructions in docs/ICON_QUALITY_PRESERVATION_GUIDE.md"
fi
