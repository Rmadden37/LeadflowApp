#!/bin/bash

# Script to check if specific files were committed

cd /Users/ryanmadden/blaze/LeadflowApp

echo "Checking if closer-card.tsx has uncommitted changes..."
git diff -- src/components/dashboard/closer-card.tsx > closer_card_diff.txt

echo "Checking if login-form.tsx has uncommitted changes..."
git diff -- src/components/auth/login-form.tsx > login_form_diff.txt

echo "Checking if lead-disposition-modal.tsx has uncommitted changes..."
git diff -- src/components/dashboard/lead-disposition-modal.tsx > disposition_modal_diff.txt

echo "Checking last commit content..."
git show --name-only HEAD > last_commit_files.txt

echo "Done checking files."
