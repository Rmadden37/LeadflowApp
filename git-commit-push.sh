#!/bin/bash

# Script to commit all changes and push to GitHub
echo "=== Git Commit and Push Script ==="

# Set the current directory
echo "Setting current directory to LeadflowApp..."
cd /Users/ryanmadden/blaze/LeadflowApp

# Check git status
echo "Checking git status..."
git status

# Add all changes
echo "Adding all changes to git..."
git add .

# Commit changes
echo "Committing changes..."
git commit -m "Fix: Implemented lead acceptance functionality and improved form stability"

# Push to GitHub
echo "Pushing to GitHub main branch..."
git push origin main

echo "Done!"
