#!/bin/zsh

# Check Firebase App Hosting Status
# Shows the current status of your Firebase App Hosting deployment

echo "🔍 Checking Firebase App Hosting status..."

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

# Get hosting site info
echo "📊 Getting Firebase App Hosting information..."
firebase hosting:sites:list

# Get recent deployments
echo -e "\n📋 Recent deployments:"
firebase hosting:releases:list --limit=5

# Display hosting channel info
echo -e "\n🌐 Hosting channels (includes preview URLs):"
firebase hosting:channel:list

echo -e "\n✅ Status check complete!"
echo "Your app should be live at: https://leadflow-4lvrr.web.app"
