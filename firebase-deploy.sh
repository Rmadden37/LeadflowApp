#!/bin/bash

# Firebase App Hosting Deployment Script

# Build the project for production
echo "Building project for production..."
npm run build

# Deploy to Firebase App Hosting
echo "Deploying to Firebase App Hosting..."
firebase deploy --only hosting:apphosting

echo "Deployment complete! Your app should now be live on Firebase App Hosting."
