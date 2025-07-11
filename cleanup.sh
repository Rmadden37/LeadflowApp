#!/bin/zsh

# Pre-deployment Cleanup Script for LeadFlow App
# This script helps clean up test files, duplicate implementations, and prepare the project for deployment

echo "🧹 LeadFlow Pre-Deployment Cleanup Script 🧹"
echo "=========================================="
echo ""
echo "This script will help clean up test files and prepare your project for deployment."
echo ""

# Create backup directory
BACKUP_DIR="_pre_deployment_backup_$(date +%Y%m%d%H%M%S)"
echo "📁 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/test_scripts"
mkdir -p "$BACKUP_DIR/alternative_components"
mkdir -p "$BACKUP_DIR/html_files"

# Backup and remove test JS files
echo "🔍 Finding test and debug JS files..."
TEST_FILES=$(find . -maxdepth 1 -type f -name "test-*.js" -o -name "check-*.js" -o -name "debug-*.js" -o -name "simple-*.js" -o -name "minimal-*.js" -o -name "create-test*.js" -o -name "verify-*.js")

if [ -n "$TEST_FILES" ]; then
  echo "📋 Found $(echo "$TEST_FILES" | wc -l | xargs) test files to clean up"
  
  for file in $TEST_FILES; do
    echo "  - Backing up: $file"
    cp "$file" "$BACKUP_DIR/test_scripts/"
    rm "$file"
  done
  
  echo "✅ Test files backed up and removed"
else
  echo "✓ No test files found"
fi

# Backup and remove test HTML files
echo "🔍 Finding test HTML files..."
HTML_FILES=$(find . -maxdepth 1 -type f -name "*.html" | grep -v "index.html")

if [ -n "$HTML_FILES" ]; then
  echo "📋 Found $(echo "$HTML_FILES" | wc -l | xargs) HTML files to clean up"
  
  for file in $HTML_FILES; do
    echo "  - Backing up: $file"
    cp "$file" "$BACKUP_DIR/html_files/"
    rm "$file"
  done
  
  echo "✅ HTML files backed up and removed"
else
  echo "✓ No HTML files found"
fi

# Backup alternative component implementations
echo "🔍 Finding alternative component implementations..."
ALT_COMPONENTS=$(find src/components -type f -name "*-clean.tsx" -o -name "*-simple.tsx" -o -name "*-fixed.tsx" -o -name "*-enhanced.tsx" -o -name "*-pure.tsx" -o -name "*-html.tsx")

if [ -n "$ALT_COMPONENTS" ]; then
  echo "📋 Found $(echo "$ALT_COMPONENTS" | wc -l | xargs) alternative components to clean up"
  
  for file in $ALT_COMPONENTS; do
    directory=$(dirname "$file")
    mkdir -p "$BACKUP_DIR/alternative_components/$directory"
    
    echo "  - Backing up: $file"
    cp "$file" "$BACKUP_DIR/alternative_components/$file"
    rm "$file"
  done
  
  echo "✅ Alternative components backed up and removed"
else
  echo "✓ No alternative components found"
fi

echo ""
echo "✨ Cleanup completed successfully! ✨"
echo ""
echo "All removed files have been backed up to: $BACKUP_DIR"
echo "If you need to restore any files, you can find them there."
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to verify everything still builds correctly"
echo "2. Run 'npm run lint' to check for any linting issues"
echo "3. Deploy to Firebase using './deploy-with-checks.sh'"
echo ""
