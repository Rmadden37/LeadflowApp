# GitHub to Firebase App Hosting Deployment Guide

This guide explains how to ensure your GitHub repository is properly connected to Firebase App Hosting for automatic deployments.

## Current Setup

Your repository is configured with a GitHub Actions workflow that will automatically deploy to Firebase App Hosting whenever you push to the `main` branch. The workflow is defined in `.github/workflows/firebase-hosting-merge.yml`.

## Prerequisites

1. Make sure you have the following GitHub Secrets set up:
   - `FIREBASE_SERVICE_ACCOUNT`: A Firebase service account token with deployment permissions

## How to Verify the Connection

1. **Check GitHub Secrets**:
   - Go to your repository on GitHub
   - Navigate to Settings > Secrets and variables > Actions
   - Verify that `FIREBASE_SERVICE_ACCOUNT` exists
   - If it doesn't exist, you'll need to create it (see below)

2. **Test the Connection**:
   - Push a small change to the `main` branch
   - Go to Actions tab in your GitHub repository
   - You should see the workflow running
   - If successful, check your Firebase App Hosting URL: `https://leadflow-4lvrr-empire-ihq2axarpa-uc.a.run.app`

## Setting up Firebase Service Account (if needed)

If you need to create or update the `FIREBASE_SERVICE_ACCOUNT` secret:

1. Generate a new service account key:
   ```bash
   # Login to Firebase
   firebase login
   
   # Get the CI token
   firebase ci:generateToken --project leadflow-4lvrr
   ```

2. Copy the generated token

3. Add it as a secret in GitHub:
   - Go to your repository > Settings > Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Paste the token you copied
   - Click "Add secret"

## Testing the Deployment

To test that everything is working:

1. Make a small change to your code
2. Commit and push to the `main` branch:
   ```bash
   git add .
   git commit -m "Testing GitHub Actions Firebase deployment"
   git push origin main
   ```

3. Monitor the deployment:
   - Check the GitHub Actions tab in your repository
   - After deployment completes, verify the app is working at your Firebase App Hosting URL

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs for error messages

2. Common issues:
   - Missing or invalid Firebase service account secret
   - Build errors in your Next.js application
   - Firebase project configuration issues

3. If the build is successful but deployment fails:
   - Check that the Firebase project ID is correct
   - Verify the hosting target name is correct (`apphosting`)
   - Check Firebase permissions for the service account

### Testing Locally Before Push

You can test the deployment locally before pushing:

```bash
# Test the CI build script
chmod +x ./ci-build.sh
./ci-build.sh

# Deploy manually to verify Firebase configuration
firebase deploy --only hosting:apphosting
```

## Additional Resources

- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Use the monitoring scripts created previously to verify deployment:
  ```bash
  ./check-hosting-status.sh
  ./test-api-endpoints.sh
  ```
