# Firebase App Hosting Configuration Guide

## What is Firebase App Hosting?

Firebase App Hosting is an enhanced version of Firebase Hosting that provides:

- Dynamic content execution
- Improved performance for web applications
- Better integration with other Firebase services
- Configurable scaling options

## Configuration Files

The LeadFlow app uses the following files for Firebase App Hosting:

1. **apphosting.yaml**: Defines App Hosting specific configurations
2. **firebase.json**: Contains hosting configuration with App Hosting target
3. **.firebaserc**: Contains the target definition linking to App Hosting
4. **GitHub Actions workflow**: Configured for App Hosting deployment

## Setting Up Firebase App Hosting

To set up Firebase App Hosting, use the provided script:

```bash
./setup-app-hosting.sh
```

This script will:
1. Check if Firebase CLI is installed
2. Log you into Firebase if needed
3. Create the hosting target for App Hosting
4. Update your .firebaserc with the appropriate configuration

## Deploying to Firebase App Hosting

### Local Deployment

To deploy your application to Firebase App Hosting from your local machine:

```bash
# Deploy with all pre-deployment checks
./deploy-with-checks.sh

# OR for a faster deployment
./deploy.sh
```

### CI/CD Deployment (GitHub Actions)

The repository is configured with a GitHub Actions workflow that:
1. Builds the application when changes are pushed to main
2. Deploys to Firebase App Hosting automatically
3. Uses the specific App Hosting target

## Monitoring and Management

You can monitor your Firebase App Hosting deployment at:
https://console.firebase.google.com/project/leadflow-4lvrr/hosting/sites

## Common Issues and Solutions

### Issue: "Firebase command not found"
Solution: Install Firebase CLI with `npm install -g firebase-tools`

### Issue: "Error: Target not found"
Solution: Run `./setup-app-hosting.sh` to set up the App Hosting target

### Issue: "Build failed during deployment"
Solution: Build locally first with `npm run build` to identify issues

### Issue: "Permission denied"
Solution: Log in to Firebase with `firebase login`

## Resources

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Firebase Hosting Configuration Guide](https://firebase.google.com/docs/hosting/full-config)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
