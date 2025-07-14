#!/bin/bash

echo "🔍 Checking Firebase App Hosting Deployment Status..."
echo "=========================================="

# Check if Firebase CLI is available
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Show recent App Hosting deployments
echo "📋 Recent App Hosting Deployments:"
firebase apphosting:list

echo ""
echo "🔄 Checking current deployment status:"
firebase apphosting:backends:get

echo ""
echo "📜 Recent git commits that triggered deployments:"
git log --oneline -5

echo ""
echo "✅ Deployment check complete!"
echo ""
echo "🔗 You can also check the deployment status at:"
echo "   https://console.firebase.google.com/project/$(cat .firebaserc | grep 'default' -A 1 | tail -1 | cut -d'"' -f4)/apphosting"
