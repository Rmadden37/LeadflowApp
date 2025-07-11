#!/bin/bash
# Monitoring script for Firebase App Hosting that can be run as a cron job
# Usage: ./monitor-app-hosting.sh [slack_webhook_url]

# Optional Slack webhook URL
SLACK_WEBHOOK_URL="$1"
LOG_FILE="/tmp/app-hosting-monitoring.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# App Hosting URL
APP_HOSTING_URL="https://leadflow-4lvrr-empire-ihq2axarpa-uc.a.run.app"

# Function to send Slack notification
send_slack_notification() {
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"⚠️ *ALERT*: $1\"}" \
      "$SLACK_WEBHOOK_URL"
  fi
}

# Function to log messages
log_message() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Check main App Hosting URL
log_message "Checking App Hosting main URL..."
HTTP_STATUS=$(curl -s -o /tmp/app_response.txt -w "%{http_code}" "$APP_HOSTING_URL")

if [[ $HTTP_STATUS == "200" ]]; then
  log_message "✅ App Hosting is UP (HTTP $HTTP_STATUS)"
else
  ERROR_MSG="❌ App Hosting is DOWN or has issues (HTTP $HTTP_STATUS)"
  log_message "$ERROR_MSG"
  send_slack_notification "$ERROR_MSG - LeadFlow App Hosting is experiencing issues!"
fi

# Check critical API endpoint (leaderboard-data)
log_message "Checking leaderboard-data API..."
API_STATUS=$(curl -s -o /tmp/api_response.txt -w "%{http_code}" "$APP_HOSTING_URL/api/leaderboard-data")

if [[ $API_STATUS == "200" ]]; then
  log_message "✅ Leaderboard API is UP (HTTP $API_STATUS)"
else
  ERROR_MSG="❌ Leaderboard API is DOWN or has issues (HTTP $API_STATUS)"
  log_message "$ERROR_MSG"
  send_slack_notification "$ERROR_MSG - LeadFlow API is experiencing issues!"
fi

# Check memory usage via Firebase CLI (if available)
if command -v firebase &> /dev/null; then
  log_message "Checking App Hosting resource usage..."
  firebase projects:list > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    # User is logged in, can run Firebase commands
    log_message "Firebase CLI is available and authenticated"
  else
    log_message "Firebase CLI is available but not authenticated"
  fi
else
  log_message "Firebase CLI is not available, skipping resource usage check"
fi

log_message "Monitoring check completed"
echo "Logs available in $LOG_FILE"
