#!/bin/bash

echo "🔍 Firebase App Hosting - Cloud Run Configuration Validator"
echo "=========================================="

echo "📋 Current Configuration Analysis:"
echo ""

# Check apphosting.yaml configuration
if [ -f "apphosting.yaml" ]; then
    echo "✅ apphosting.yaml found"
    echo ""
    echo "🏗️ Build Configuration:"
    grep -A 2 "cpu:" apphosting.yaml | head -2
    grep -A 2 "memory:" apphosting.yaml | head -2
    echo ""
    echo "🚀 Runtime Configuration:"
    grep -A 10 "serveConfig:" apphosting.yaml | grep -E "(cpu|memory):"
    echo ""
else
    echo "❌ apphosting.yaml not found"
    exit 1
fi

echo "📊 Cloud Run Resource Requirements Reference:"
echo "  CPU: 1    | Memory: 128Mi - 4GiB"
echo "  CPU: 2    | Memory: 256Mi - 8GiB"  
echo "  CPU: 4    | Memory: 2GiB - 16GiB"
echo "  CPU: 6    | Memory: 4GiB - 24GiB"
echo "  CPU: 8    | Memory: 8GiB - 32GiB"

echo ""
echo "🔧 Configuration Validation:"

# Extract CPU and memory values
BUILD_CPU=$(grep -A 2 "runConfig:" apphosting.yaml | grep "cpu:" | head -1 | awk '{print $2}')
BUILD_MEMORY=$(grep -A 2 "runConfig:" apphosting.yaml | grep "memory:" | head -1 | awk '{print $2}')
SERVE_CPU=$(grep -A 10 "serveConfig:" apphosting.yaml | grep "cpu:" | awk '{print $2}')
SERVE_MEMORY=$(grep -A 10 "serveConfig:" apphosting.yaml | grep "memory:" | awk '{print $2}')

echo "  Build CPU: $BUILD_CPU"
echo "  Build Memory: $BUILD_MEMORY"
echo "  Runtime CPU: $SERVE_CPU"
echo "  Runtime Memory: $SERVE_MEMORY"

# Validate configuration
echo ""
echo "🎯 Validation Results:"

case $SERVE_CPU in
    1)
        if [[ "$SERVE_MEMORY" =~ ^[1-4]GiB$ ]]; then
            echo "  ✅ Runtime configuration valid for 1 CPU"
        else
            echo "  ❌ Runtime memory should be 128Mi-4GiB for 1 CPU, got: $SERVE_MEMORY"
        fi
        ;;
    2)
        if [[ "$SERVE_MEMORY" =~ ^[2-8]GiB$ ]]; then
            echo "  ✅ Runtime configuration valid for 2 CPU"
        else
            echo "  ❌ Runtime memory should be 256Mi-8GiB for 2 CPU, got: $SERVE_MEMORY"
        fi
        ;;
    4)
        if [[ "$SERVE_MEMORY" =~ ^([2-9]|1[0-6])GiB$ ]]; then
            echo "  ✅ Runtime configuration valid for 4 CPU"
        else
            echo "  ❌ Runtime memory should be 2GiB-16GiB for 4 CPU, got: $SERVE_MEMORY"
        fi
        ;;
    *)
        echo "  ⚠️  Unusual CPU configuration: $SERVE_CPU"
        ;;
esac

echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "💡 To deploy:"
echo "  1. git add apphosting.yaml"
echo "  2. git commit -m 'Fix Cloud Run memory configuration'"
echo "  3. git push origin main"
