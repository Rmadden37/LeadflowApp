#!/bin/bash

# Firebase App Hosting Deployment Script

# Build the project for production
echo "Building project for production..."
npm run build

# Deploy to Firebase Hosting
echo "Deploying to Firebase App Hosting..."
firebase deploy --only hosting

echo "Deployment complete! Your app should now be live on Firebase App Hosting."
