#!/bin/bash

# Test script to check both Firebase Hosting and App Hosting
echo "==================================="
echo "🔍 LeadFlow Hosting Validation Tool"
echo "==================================="

# Check Firebase Static Hosting URL
echo "🌐 Checking Firebase Static Hosting (standard)..."
curl -s -o /dev/null -w "%{http_code}" https://leadflow-4lvrr.web.app > /tmp/static_status.txt
STATIC_STATUS=$(cat /tmp/static_status.txt)

if [[ $STATIC_STATUS == "200" ]]; then
  echo "✅ Firebase Static Hosting is UP (HTTP $STATIC_STATUS)"
else
  echo "❌ Firebase Static Hosting is DOWN or has issues (HTTP $STATIC_STATUS)"
fi

# Check Firebase App Hosting URL
echo "🌐 Checking Firebase App Hosting..."
curl -s -o /dev/null -w "%{http_code}" https://leadflow-4lvrr-empire-ihq2axarpa-uc.a.run.app > /tmp/app_status.txt
APP_STATUS=$(cat /tmp/app_status.txt)

if [[ $APP_STATUS == "200" ]]; then
  echo "✅ Firebase App Hosting is UP (HTTP $APP_STATUS)"
else
  echo "❌ Firebase App Hosting is DOWN or has issues (HTTP $APP_STATUS)"
fi

# Check GitHub Actions deployment URL
echo "🌐 Checking GitHub Actions deployment URL..."
curl -s -o /dev/null -w "%{http_code}" https://leadflow-4lvrr-us-central1f-empire.web.app > /tmp/github_status.txt
GITHUB_STATUS=$(cat /tmp/github_status.txt)

if [[ $GITHUB_STATUS == "200" ]]; then
  echo "✅ GitHub Actions deployment is UP (HTTP $GITHUB_STATUS)"
else
  echo "❌ GitHub Actions deployment is DOWN or has issues (HTTP $GITHUB_STATUS)"
fi

echo ""
echo "==================================="
echo "📋 Deployment Options:"
echo "==================================="
echo "1. For Static Hosting: ./deploy.sh"
echo "2. For App Hosting: ./deploy-app-hosting-simple.sh"
echo "==================================="
