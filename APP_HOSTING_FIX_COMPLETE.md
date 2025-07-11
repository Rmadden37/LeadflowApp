# Firebase App Hosting Deployment Fix

This document explains how to fix the Firebase App Hosting deployment issue for the LeadFlow application.

## Identified Issues

1. **Configuration Mismatch**: Our Next.js configuration was set for static export (`output: 'export'`) which is incompatible with Firebase App Hosting.

2. **Build Directory Mismatch**: Firebase App Hosting was looking for files in `dist` but our Next.js server build outputs to `.next`.

3. **API Route Bug**: There was a variable reference bug in `src/app/api/leaderboard-data/route.ts`.

## Complete Solution

1. **Fixed API Route Bug**:
   - Changed `const csv = await res.text();` to `const csv = await csvResponse.text();` in leaderboard-data route.

2. **Created App Hosting Configuration Files**:
   - `next.config.app-hosting.js` - A separate Next.js config optimized for server-side rendering
   - `firebase.app-hosting.json` - A Firebase config that points to the `.next` directory

3. **Created Deployment Script**:
   - The `deploy-app-hosting-simple.sh` script correctly builds and deploys for App Hosting

## Deployment Steps

Run this command to deploy to App Hosting:

```bash
./deploy-app-hosting-simple.sh
```

## Troubleshooting Common Issues

- If deployment fails with "Directory does not exist" errors, check that:
  1. You're using the correct Firebase configuration
  2. The Next.js build completed successfully

- If the app shows a blank screen after deployment:
  1. Check for JavaScript errors in the browser console
  2. Verify environment variables are set correctly

## Understanding App Hosting vs. Static Hosting

- **Static Hosting**: For client-side only apps (uses `next export` output)
- **App Hosting**: For server-side rendering apps (uses the `.next` directory)

## Important Notes

- **Do not mix configurations**: Never use static export settings with App Hosting
- **Always restore configs**: The deployment script automatically restores your configuration files
- **Check logs**: Use `firebase functions:log` to see server-side errors
