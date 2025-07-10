#!/bin/bash

# Output file for git diagnostics
LOGFILE="git_diagnostics.log"

echo "Running Git diagnostics at $(date)" > $LOGFILE
echo "----------------------------------------" >> $LOGFILE

# Check if .git directory exists
echo "Checking if this is a git repository..." >> $LOGFILE
if [ -d ".git" ]; then
  echo "YES - .git directory exists" >> $LOGFILE
else
  echo "NO - .git directory does not exist!" >> $LOGFILE
  exit 1
fi

# Check git version
echo "Git version:" >> $LOGFILE
git --version >> $LOGFILE 2>&1

# Check git status
echo "----------------------------------------" >> $LOGFILE
echo "Git status:" >> $LOGFILE
git status >> $LOGFILE 2>&1

# Check recent commits
echo "----------------------------------------" >> $LOGFILE
echo "Recent commits (last 5):" >> $LOGFILE
git log -n 5 --pretty=format:"%h - %an, %ar : %s" >> $LOGFILE 2>&1

# Check branches
echo "----------------------------------------" >> $LOGFILE
echo "Branches:" >> $LOGFILE
git branch -v >> $LOGFILE 2>&1

# Check remote configuration
echo "----------------------------------------" >> $LOGFILE
echo "Remote repositories:" >> $LOGFILE
git remote -v >> $LOGFILE 2>&1

# Check unpushed commits
echo "----------------------------------------" >> $LOGFILE
echo "Unpushed commits:" >> $LOGFILE
git log origin/main..HEAD --oneline >> $LOGFILE 2>&1

# Check for modified files
echo "----------------------------------------" >> $LOGFILE
echo "Modified files:" >> $LOGFILE
git diff --name-status >> $LOGFILE 2>&1

# Check for staged files
echo "----------------------------------------" >> $LOGFILE
echo "Staged files:" >> $LOGFILE
git diff --name-status --cached >> $LOGFILE 2>&1

# Check git config
echo "----------------------------------------" >> $LOGFILE
echo "Git configuration:" >> $LOGFILE
git config --list >> $LOGFILE 2>&1

echo "Git diagnostics completed. Results saved to $LOGFILE"
