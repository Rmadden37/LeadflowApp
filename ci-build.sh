#!/bin/bash

# LeadFlow CI Build Script for Firebase App Hosting
# This script is designed to run in CI/CD environments (GitHub Actions)

set -e  # Exit on any error

echo "🚀 Starting LeadFlow CI build for Firebase App Hosting..."

# Environment validation
echo "📋 Environment Information:"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next out dist

# Configure for App Hosting deployment
echo "⚙️  Configuring for Firebase App Hosting..."

# For Firebase App Hosting, we need server-side rendering enabled
# The current next.config.js should already be configured for App Hosting
echo "📝 Using current Next.js configuration for App Hosting..."

# Set environment variables for App Hosting build
export NEXT_PUBLIC_DEPLOY_TARGET=app-hosting
export NEXT_PUBLIC_STATIC_EXPORT=false
export NODE_ENV=production

echo "🔧 Environment variables set:"
echo "  NEXT_PUBLIC_DEPLOY_TARGET=$NEXT_PUBLIC_DEPLOY_TARGET"
echo "  NEXT_PUBLIC_STATIC_EXPORT=$NEXT_PUBLIC_STATIC_EXPORT"
echo "  NODE_ENV=$NODE_ENV"

# Run TypeScript type checking
echo "🔍 Running TypeScript type checking..."
npm run typecheck

# Run linting
echo "🧹 Running ESLint..."
npm run lint:check

# Build the application for Firebase App Hosting (standalone mode)
echo "🏗️  Building application for Firebase App Hosting..."
npm run build

# Verify build output for App Hosting
echo "✅ Verifying App Hosting build output..."
if [ ! -d ".next" ]; then
    echo "❌ Build failed: .next directory not found"
    exit 1
fi

# Check for standalone output (required for App Hosting)
if [ -d ".next/standalone" ]; then
    echo "✅ Standalone build found - ready for App Hosting"
    echo "📊 Standalone build statistics:"
    ls -la .next/standalone/ | head -5
else
    echo "⚠️  Standalone build not found - checking if Next.js config is correct"
fi

# Check for critical files
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build failed: BUILD_ID not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📊 Build statistics:"
ls -la .next/ | head -10

# For Firebase App Hosting, we don't need to copy Firebase config
# App Hosting uses the .next directory directly
echo "✅ Firebase App Hosting will use .next directory"

echo "🎉 CI build process completed successfully!"
echo "📦 Ready for Firebase App Hosting deployment"
