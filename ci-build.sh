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

# Use App Hosting specific Next.js configuration
if [ -f "next.config.app-hosting.js" ]; then
    echo "📝 Using App Hosting Next.js configuration..."
    cp next.config.app-hosting.js next.config.js
else
    echo "⚠️  App Hosting config not found, using default..."
fi

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

# Build the application for production
echo "🏗️  Building application for Firebase App Hosting..."
npm run build

# Verify build output
echo "✅ Verifying build output..."
if [ ! -d ".next" ]; then
    echo "❌ Build failed: .next directory not found"
    exit 1
fi

# Check for critical files
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build failed: BUILD_ID not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📊 Build statistics:"
ls -la .next/ | head -10

# Configure Firebase for App Hosting if config exists
if [ -f "firebase.app-hosting.json" ]; then
    echo "📝 Configuring Firebase for App Hosting..."
    cp firebase.app-hosting.json firebase.json
    echo "✅ Firebase configuration updated"
fi

echo "🎉 CI build process completed successfully!"
echo "📦 Ready for Firebase App Hosting deployment"
