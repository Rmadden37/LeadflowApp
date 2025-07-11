#!/bin/bash

# CI-specific build script for GitHub Actions
# This script skips the prebuild checks and focuses only on the Next.js build

echo "🚀 Running CI-specific build script..."

# Set NODE_OPTIONS to increase memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"

# Run next build without prebuild checks
echo "Building Next.js application..."
npx next build

# Check build status
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed!"
  exit 1
fi

# Verify the dist directory exists
if [ -d "dist" ]; then
  echo "✅ dist directory exists"
  
  # List files in dist directory for debugging
  echo "Contents of dist directory:"
  ls -la dist
else
  echo "❌ dist directory is missing! Check your next.config.js settings."
  exit 1
fi

echo "✅ CI build process completed successfully!"
