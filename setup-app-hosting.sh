#!/bin/bash

# Setup Firebase App Hosting targets
# This script configures Firebase hosting targets for the LeadFlow app

echo "🎯 Setting up Firebase App Hosting targets..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Authenticate with Firebase if needed
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1 || {
    echo "📧 Please login to Firebase..."
    firebase login
}

# Create the hosting target for App Hosting
echo "🎯 Creating App Hosting target..."
firebase target:apply hosting apphosting leadflow-4lvrr

echo "✅ Firebase App Hosting target setup complete!"
echo "📝 Your .firebaserc has been updated with the App Hosting target."
echo ""
echo "Next steps:"
echo "1. Deploy your app using: ./deploy.sh"
echo "2. Your app will be available at: https://leadflow-4lvrr.web.app"
