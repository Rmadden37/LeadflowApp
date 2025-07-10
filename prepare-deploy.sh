#!/bin/bash

# Prepare for deployment script
echo "🔥 Preparing LeadFlow App for Firebase App Hosting deployment..."

# Clean up
echo "🧹 Cleaning up build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run linting
echo "🔍 Checking code quality with ESLint..."
npm run lint

# Type checking
echo "✅ Verifying TypeScript compilation..."
npx tsc --noEmit

# Building for production
echo "🏗️ Building for production..."
npm run build

# Commit changes if any
echo "📝 Committing changes to git..."
git add .
git commit -m "Fix: Implemented lead acceptance functionality and improved form stability"

# Push to main branch
echo "🚀 Pushing changes to GitHub main branch..."
git push origin main

echo "✨ All done! The app is ready for Firebase App Hosting deployment."
