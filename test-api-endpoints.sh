#!/bin/bash
# Test script to verify API endpoints in App Hosting environment
echo "==================================="
echo "🔍 LeadFlow API Endpoint Test Tool"
echo "==================================="

# Set the base URL for your App Hosting deployment
APP_HOSTING_URL="https://leadflow-4lvrr-empire-ihq2axarpa-uc.a.run.app"

# Function to test an API endpoint
test_endpoint() {
  local endpoint=$1
  local name=$2
  
  echo "🌐 Testing $name API..."
  HTTP_STATUS=$(curl -s -o /tmp/api_response.txt -w "%{http_code}" "$APP_HOSTING_URL/api/$endpoint")
  
  if [[ $HTTP_STATUS == "200" ]]; then
    echo "✅ $name API is responding (HTTP $HTTP_STATUS)"
    echo "Response preview:"
    head -n 10 /tmp/api_response.txt | jq . 2>/dev/null || cat /tmp/api_response.txt | head -n 5
  else
    echo "❌ $name API is not working properly (HTTP $HTTP_STATUS)"
    cat /tmp/api_response.txt
  fi
  echo ""
}

# Test each API endpoint
test_endpoint "leaderboard-data" "Leaderboard Data"
test_endpoint "places-autocomplete" "Places Autocomplete"
test_endpoint "simple-users" "Simple Users"
test_endpoint "name-matching" "Name Matching"
test_endpoint "chatbot" "Chatbot"

echo "==================================="
echo "📋 API Testing Complete"
echo "==================================="
