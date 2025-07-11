# Firebase App Hosting Troubleshooting Guide

This guide provides solutions for common Firebase App Hosting deployment issues.

## Common Issues and Solutions

### 1. "Build failed" Error in GitHub Actions

**Symptoms:**
- GitHub Actions workflow shows "Build failed"
- App Hosting deployment fails after 3 minutes

**Solutions:**
1. **Check API Routes for Errors**:
   - Look for variables referenced before being defined
   - Ensure proper error handling in API routes
   - Remove or fix any server-side code that assumes static export

2. **Fix Configuration**:
   - Use `next.config.app-hosting.js` configuration
   - Set `NEXT_PUBLIC_STATIC_EXPORT=false` environment variable
   - Point Firebase configuration to the `.next` directory

3. **Check Logs**:
   ```bash
   firebase functions:log
   ```

### 2. "Directory 'dist' does not exist" Error

**Symptoms:**
- Deployment fails with "Directory 'dist' for Hosting does not exist"

**Solutions:**
1. **Fix Firebase Configuration**:
   - Ensure firebase.json points to the `.next` directory:
   ```json
   "hosting": {
     "target": "apphosting",
     "public": ".next"
   }
   ```
   
2. **Verify Build Output**:
   ```bash
   ls -la .next
   ```
   
3. **Use the correct deployment script**:
   ```bash
   ./deploy-app-hosting-simple.sh
   ```

### 3. API Routes Not Working After Deployment

**Symptoms:**
- API routes return 404 errors
- Server-side features don't work

**Solutions:**
1. **Check Route Export Configuration**:
   - Remove any `export const config = { output: 'export' }` from API routes
   - Use dynamic routes where appropriate

2. **Set Environment Variables**:
   ```bash
   NEXT_PUBLIC_STATIC_EXPORT=false npm run build
   ```

3. **Check Route Handlers**:
   - Ensure API routes use NextRequest/NextResponse correctly
   - Add proper error handling

### 4. Blank Screen After Deployment

**Symptoms:**
- Site loads but shows a blank page
- Console errors in browser

**Solutions:**
1. **Check Browser Console** for JavaScript errors
   
2. **Verify Environment Variables**:
   - Make sure all required env variables are set in the App Hosting environment
   
3. **Test Locally First**:
   ```bash
   npm run build && npm start
   ```

## Firebase App Hosting vs Static Hosting

### Key Differences

| Feature | App Hosting | Static Hosting |
|---------|------------|---------------|
| Configuration | Server-side rendering | Static files only |
| Output Directory | .next | dist |
| Next.js Config | No static export | output: 'export' |
| Environment | Node.js runtime | CDN only |
| API Routes | Fully supported | Not supported |
| Deployment | deploy-app-hosting-simple.sh | deploy.sh |

## Command Reference

### Deployment Commands

```bash
# Deploy to App Hosting
./deploy-app-hosting-simple.sh

# Check deployment status
./check-hosting-status.sh

# View Firebase logs
firebase functions:log
```

### Configuration Files

```bash
# App Hosting Next.js config
cp next.config.app-hosting.js next.config.js

# App Hosting Firebase config
cp firebase.app-hosting.json firebase.json
```
