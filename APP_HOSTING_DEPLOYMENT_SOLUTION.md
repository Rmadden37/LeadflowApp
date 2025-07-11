# Firebase App Hosting Deployment Guide

This document explains how to deploy the LeadFlow application to Firebase App Hosting.

## What is Firebase App Hosting?

Firebase App Hosting is different from regular Firebase Hosting:

- **Regular Firebase Hosting** is for static files (HTML, CSS, JS)
- **App Hosting** is for server-rendered applications that need Node.js runtime

## Known Issues

Our application was configured for regular Firebase Hosting (static export) but this doesn't work with App Hosting which requires a server-side setup.

## Deployment Solution

We've created a specialized deployment script to address this issue:

1. `deploy-app-hosting-simple.sh` - Uses a different Next.js configuration for App Hosting deployment

## How to Deploy to App Hosting

Run the following command:

```bash
./deploy-app-hosting-simple.sh
```

This script:
1. Uses a different Next.js configuration optimized for App Hosting
2. Builds the app in server-side rendering mode
3. Deploys only to the App Hosting target
4. Restores the original configuration after deployment

## Troubleshooting

If deployment fails with a "Build failed" error:

1. Check the Firebase console for error details
2. Ensure you're using the correct deployment script
3. Try running `firebase functions:log` to see server logs

## Configuration Files

- `next.config.app-hosting.js` - Next.js configuration optimized for App Hosting
- `next.config.js` - Regular configuration for static hosting
- `apphosting.yaml` - App Hosting configuration

## Important Notes

- App Hosting and regular Firebase Hosting use different build outputs
- App Hosting requires server-side rendering enabled in Next.js
- Never deploy to both targets at once with the same build output
