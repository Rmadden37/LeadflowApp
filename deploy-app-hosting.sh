#!/bin/bash

# LeadFlow Firebase App Hosting Deployment Script
set -e

echo "🚀 Starting LeadFlow deployment to Firebase App Hosting..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Authenticate with Firebase (if needed)
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1 || {
    echo "📧 Please login to Firebase..."
    firebase login
}

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting and fix issues
echo "🧹 Running linter with auto-fix..."
npx next lint --fix || echo "⚠️  Some linting issues found but continuing..."

# Clean previous builds
echo "🧽 Cleaning previous builds..."
rm -rf .next out dist

# Create a temporary next.config.js for App Hosting (serverless) build
echo "📝 Creating temporary Next.js config for App Hosting..."
cp next.config.js next.config.js.bak
sed -i '' 's/output: .export.,/\/\/ output: "export",/' next.config.js
sed -i '' 's/distDir: .dist.,/distDir: ".next",/' next.config.js
sed -i '' 's/unoptimized: true,/\/\/ unoptimized: true,/' next.config.js

# Build the application for App Hosting (serverless)
echo "🏗️  Building application for App Hosting..."
npm run build

# Check if build directory exists
if [ ! -d ".next" ]; then
    echo "❌ Build output directory '.next' not found"
    # Restore original next.config.js
    mv next.config.js.bak next.config.js
    exit 1
fi

# Deploy only to Firebase App Hosting
echo "🚀 Deploying to Firebase App Hosting..."
firebase deploy --only hosting:apphosting,functions

# Restore original next.config.js
echo "🔄 Restoring original Next.js config..."
mv next.config.js.bak next.config.js

echo "✅ App Hosting deployment complete!"
echo "🌐 Your application should be available at your Firebase App Hosting URL"
