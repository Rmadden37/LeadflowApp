#!/bin/bash

# LeadFlow Firebase Deployment Script
# Prepares and deploys the application to Firebase App Hosting

# Display banner
echo "======================================================="
echo "🚀 LEADFLOW FIREBASE DEPLOYMENT PREPARATION & DEPLOYMENT"
echo "======================================================="
echo ""

# Check if Git is clean
echo "🔍 Checking Git status..."
if [[ -n $(git status -s) ]]; then
  echo "⚠️  You have uncommitted changes. Commit or stash them before deploying."
  git status
  
  read -p "Do you want to commit these changes? (y/n) " -n 1 -r
  echo    # move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter commit message: " commit_msg
    git add .
    git commit -m "$commit_msg"
    echo "✅ Changes committed!"
  else
    echo "❌ Deployment aborted. Please handle uncommitted changes first."
    exit 1
  fi
fi

# Run TypeScript type checking
echo "🔍 Running TypeScript type checking..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Fix them before deploying."
  exit 1
else
  echo "✅ TypeScript checks passed!"
fi

# Run linting
echo "🔍 Running linting..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting errors found. Fix them before deploying."
  exit 1
else
  echo "✅ Linting passed!"
fi

# Check if environment variables are set
echo "🔍 Checking environment variables..."
if [ ! -f .env.local ]; then
  echo "❌ No .env.local file found. Create one from .env.example before deploying."
  exit 1
else
  env_var_count=$(grep -v '^#' .env.local | grep -v '^$' | wc -l)
  echo "✅ Found $env_var_count environment variables set."
fi

# Build the application
echo "🔨 Building the application..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix the errors before deploying."
  exit 1
else
  echo "✅ Build successful!"
fi

# Deploy to Firebase App Hosting
echo "🚀 Deploying to Firebase App Hosting..."
firebase deploy --only hosting:apphosting

if [ $? -ne 0 ]; then
  echo "❌ Deployment failed. Check Firebase CLI errors."
  exit 1
else
  echo ""
  echo "======================================================"
  echo "✅ DEPLOYMENT COMPLETE!"
  echo "======================================================"
  echo ""
  echo "Your LeadFlow app has been deployed to Firebase App Hosting."
  echo "Check the Firebase console for the deployed URL and statistics."
  echo ""
  echo "Don't forget to:"
  echo "1. Test all critical features on the live site"
  echo "2. Set up monitoring in Firebase console"
  echo "3. Check for any console errors in the live app"
  echo ""
fi
