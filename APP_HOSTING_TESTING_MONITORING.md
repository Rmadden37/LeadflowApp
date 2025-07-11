# Firebase App Hosting Testing & Monitoring Guide

This guide provides instructions for testing, monitoring, and optimizing your Firebase App Hosting deployment.

## Quick Status Check

Run the status check script to verify all hosting targets:

```bash
./check-hosting-status.sh
```

## API Endpoint Testing

To test that all API endpoints are working correctly in the App Hosting environment:

```bash
chmod +x ./test-api-endpoints.sh
./test-api-endpoints.sh
```

This script will verify each API endpoint and display response data.

## Continuous Monitoring

### Setting Up Automated Monitoring

1. Make the monitoring script executable:

```bash
chmod +x ./monitor-app-hosting.sh
```

2. Set up a cron job to run the script regularly (every 30 minutes):

```bash
(crontab -l 2>/dev/null; echo "*/30 * * * * /path/to/leadflow/monitor-app-hosting.sh https://hooks.slack.com/your-webhook-url") | crontab -
```

Replace `https://hooks.slack.com/your-webhook-url` with your actual Slack webhook URL for notifications.

### Preventing Cold Starts

To optimize performance by preventing cold starts:

1. Make the keep-alive script executable:

```bash
chmod +x ./keep-app-warm.sh
```

2. Set up a cron job to run the script every 10 minutes:

```bash
(crontab -l 2>/dev/null; echo "*/10 * * * * /path/to/leadflow/keep-app-warm.sh") | crontab -
```

## Performance Optimization

### Memory & CPU Considerations

- The current configuration allocates 1GB of memory to the App Hosting instance
- Increase this value in `apphosting.yaml` if you experience memory pressure
- Consider setting `maxInstances` higher if you expect spikes in traffic

### Cold Start Prevention

- Use the keep-alive script during business hours
- Consider adding prerender options for critical pages

## Troubleshooting Common Issues

### API Route Errors

If API routes return errors in the App Hosting environment:

1. Check that the route is not marked as `'force-static'` without a conditional check
2. Verify that any external API calls have proper error handling
3. Check environment variables needed by the API are available in App Hosting

### Deployment Failures

If deployment fails:

1. Check Firebase deployment logs:
   ```bash
   firebase deploy --debug --only hosting:apphosting
   ```

2. Verify build output directory:
   ```bash
   ls -la .next/
   ```

3. Check for Node.js version compatibility issues between your development environment and App Hosting

## Regular Maintenance

For best performance and reliability, regularly:

1. Update Next.js and dependencies
2. Monitor App Hosting resource usage through Firebase Console
3. Review deployment logs for warnings or errors
4. Test all API endpoints weekly with the testing script
