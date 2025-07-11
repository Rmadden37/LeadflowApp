#!/bin/bash

# LeadFlow Firebase App Hosting Simple Deployment Script
set -e

echo "🚀 Starting LeadFlow deployment to Firebase App Hosting..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Clean previous builds
echo "🧽 Cleaning previous builds..."
rm -rf .next out dist

# Backup original next.config.js
echo "📝 Backing up original Next.js config..."
cp next.config.js next.config.js.original

# Use the App Hosting specific Next.js config
echo "📝 Using App Hosting specific Next.js config..."
cp next.config.app-hosting.js next.config.js

# Build the application for App Hosting (serverless)
echo "🏗️  Building application for App Hosting..."
NEXT_PUBLIC_DEPLOY_TARGET=app-hosting NEXT_PUBLIC_STATIC_EXPORT=false npm run build

# Copy Firebase App Hosting config
echo "📝 Using Firebase App Hosting config..."
cp firebase.app-hosting.json firebase.json.original
cp firebase.app-hosting.json firebase.json

# Deploy to Firebase App Hosting
echo "🚀 Deploying to Firebase App Hosting..."
firebase deploy --only hosting:apphosting

# Restore original firebase.json
echo "🔄 Restoring original firebase.json..."
mv firebase.json.original firebase.json

# Restore original next.config.js
echo "🔄 Restoring original Next.js config..."
mv next.config.js.original next.config.js

echo "✅ App Hosting deployment complete!"
echo "🌐 Your application should be available at your Firebase App Hosting URL"

# Remind about testing
echo ""
echo "📊 To check hosting status run: ./check-hosting-status.sh"
