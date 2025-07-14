#!/bin/bash

# Simple deployment checker
URL="https://leadflow-app--leadflow-app-436022.web.app"
CHECK_INTERVAL=60  # Check every 60 seconds
MAX_CHECKS=20      # Check for up to 20 minutes

echo "🔍 Monitoring Firebase App Hosting Deployment"
echo "URL: $URL"
echo "Checking every $CHECK_INTERVAL seconds for up to $MAX_CHECKS attempts"
echo "Started at: $(date)"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
    echo "Check $i/$MAX_CHECKS at $(date)"
    
    # Test if site is accessible
    if curl -s -f "$URL" > /dev/null 2>&1; then
        echo "🎉 SUCCESS! Site is now accessible"
        echo "Testing performance..."
        
        # Measure load time
        start_time=$(date +%s.%N)
        curl -s "$URL" > /dev/null 2>&1
        end_time=$(date +%s.%N)
        
        if command -v bc > /dev/null 2>&1; then
            load_time=$(echo "$end_time - $start_time" | bc -l)
            echo "⚡ Load time: ${load_time}s"
            
            if (( $(echo "$load_time < 3.0" | bc -l) )); then
                echo "✅ Performance target met!"
            else
                echo "⚠️  Load time above 3s target"
            fi
        fi
        
        echo ""
        echo "🎯 Deployment Complete!"
        echo "Live URL: $URL"
        echo "Time: $(date)"
        break
    else
        echo "⏳ Site not yet accessible, waiting $CHECK_INTERVAL seconds..."
        sleep $CHECK_INTERVAL
    fi
done

if [ $i -eq $MAX_CHECKS ]; then
    echo "❌ Site did not become accessible within $(($MAX_CHECKS * $CHECK_INTERVAL / 60)) minutes"
    echo "Check Firebase console for deployment status"
fi
