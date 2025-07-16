#!/bin/bash

echo "🚀 DEPLOYING 45-MINUTE LEAD TRANSITION FUNCTION"
echo "================================================"

# Change to project directory
cd /Users/ryanmadden/blaze/LeadflowApp

# Build functions first
echo "📦 Building Firebase Functions..."
cd functions
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Functions built successfully"
else
    echo "❌ Function build failed"
    exit 1
fi

# Go back to root
cd ..

# Deploy functions
echo "🚀 Deploying to Firebase..."
firebase deploy --only functions --project leadflow-4lvrr

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 The 45-minute scheduled lead transition function is now active!"
    echo "📅 It will run every 2 minutes to check for verified scheduled leads"
    echo "⏰ Leads will automatically move to waiting_assignment 45 minutes before their appointment"
    echo ""
    echo "🔍 To monitor the function:"
    echo "firebase functions:log --only processScheduledLeadTransitions"
else
    echo "❌ Deployment failed"
    exit 1
fi
