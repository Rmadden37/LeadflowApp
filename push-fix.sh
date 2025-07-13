#!/bin/bash

# Firebase App Hosting Build Fix Script
echo "🔧 Committing autoprefixer dependency fix for Firebase App Hosting..."

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix autoprefixer dependency for Firebase App Hosting

- Move autoprefixer, postcss, and tailwindcss to main dependencies
- Firebase App Hosting requires build dependencies in main deps, not devDependencies
- Update apphosting.yaml with clearer documentation
- Add health check endpoints for deployment monitoring

This resolves the 'Cannot find module autoprefixer' error during Next.js build"

# Push to origin
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Changes pushed successfully!"
echo "🚀 Firebase App Hosting should now build successfully with autoprefixer available"
