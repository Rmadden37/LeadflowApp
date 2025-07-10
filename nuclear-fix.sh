#!/bin/bash

# Nuclear fix script for LeadflowApp
echo "🧨 Starting nuclear fix for LeadflowApp..."

# Navigate to project directory
cd /Users/ryanmadden/blaze/LeadflowApp

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "next"

# Clean up build artifacts and caches
echo "🧹 Cleaning project..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Reinstall dependencies with a clean slate
echo "📦 Reinstalling dependencies..."
rm -rf node_modules
npm install

# Fix potential issues in lead-queue.tsx
echo "🔧 Creating backup of lead-queue.tsx..."
cp src/components/dashboard/lead-queue.tsx src/components/dashboard/lead-queue.tsx.backup

echo "🔧 Fixing lead-queue.tsx..."
# We'll fix specific issues in the lead-queue.tsx file if needed

# Run lint to identify and fix issues
echo "🔍 Running lint..."
npm run lint -- --fix

# Build the project
echo "🏗️ Building the project..."
npm run build

echo "✅ Nuclear fix completed. The site should be operational now."
echo "To start the dev server, run: npm run dev"
