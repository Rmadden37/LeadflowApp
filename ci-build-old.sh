#!/bin/bash

# CI Build Script for Firebase App Hosting
# This script handles the build process for CI/CD deployment

set -e  # Exit on any error

echo "🚀 Starting CI build for Firebase App Hosting..."

# Set environment variables for App Hosting
export NEXT_PUBLIC_DEPLOY_TARGET=app-hosting
export NEXT_PUBLIC_STATIC_EXPORT=false
export NODE_ENV=production

echo "📦 Installing dependencies..."
npm ci

echo "🧹 Cleaning previous builds..."
rm -rf .next out dist

echo "🔧 Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"

# Verify the build
if [ ! -d ".next" ]; then
    echo "❌ Build failed - .next directory not found"
    exit 1
fi

echo "🎉 CI build completed for Firebase App Hosting"
