#!/bin/bash
# Keep-alive script to prevent cold starts for Firebase App Hosting
# Recommended to run this script every 5-10 minutes via cron
# Usage: ./keep-app-warm.sh

# App Hosting URL
APP_HOSTING_URL="https://leadflow-4lvrr-empire-ihq2axarpa-uc.a.run.app"
LOG_FILE="/tmp/app-hosting-keepalive.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Function to log messages
log_message() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Send a ping to the main URL
log_message "Sending keep-alive ping to App Hosting..."
START_TIME=$(date +%s.%N)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_HOSTING_URL")
END_TIME=$(date +%s.%N)

# Calculate response time
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

if [[ $HTTP_STATUS == "200" ]]; then
  log_message "✅ App Hosting is responsive (HTTP $HTTP_STATUS, response time: ${RESPONSE_TIME}s)"
else
  log_message "❌ App Hosting ping failed (HTTP $HTTP_STATUS)"
fi

# Optional: ping a critical API endpoint to keep it warm too
log_message "Sending keep-alive ping to leaderboard API..."
START_TIME=$(date +%s.%N)
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_HOSTING_URL/api/leaderboard-data")
END_TIME=$(date +%s.%N)

# Calculate API response time
API_RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

if [[ $API_STATUS == "200" ]]; then
  log_message "✅ API is responsive (HTTP $API_STATUS, response time: ${API_RESPONSE_TIME}s)"
else
  log_message "❌ API ping failed (HTTP $API_STATUS)"
fi

log_message "Keep-alive completed"
