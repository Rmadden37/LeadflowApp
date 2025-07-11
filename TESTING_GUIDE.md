# Manual Testing Guide for Scheduled Leads Fix

## Problem Summary
- Users reported that leads scheduled for future dates weren't appearing in the Scheduled portion of the Lead Queue
- Issue was that users could only set status to "rescheduled" but the system expected some leads to have "scheduled" status

## Fixes Applied

### 1. Enhanced Disposition Modal
- Added "scheduled" as a disposition option alongside "rescheduled"
- File: `/src/components/dashboard/lead-disposition-modal.tsx`
- Users can now choose either "rescheduled" or "scheduled" when scheduling appointments

### 2. Added Debug Logging
- Enhanced lead queue with extensive console logging
- File: `/src/components/dashboard/lead-queue.tsx` 
- Shows query results, lead processing details, and date filtering logic

## Manual Testing Steps

### Step 1: Check Existing Scheduled Leads
1. Open the application at http://localhost:9002
2. Navigate to the Lead Queue
3. Click the "Scheduled" tab
4. Open browser developer console (F12)
5. Look for debug output starting with "🔍 DEBUG:"

### Step 2: Create a Test Scheduled Lead
1. Find any existing lead in the "Waiting List" tab
2. Click on the lead to open details
3. Click "Update Disposition" 
4. Select "scheduled" (new option) or "rescheduled"
5. Set a date and time for today
6. Save the disposition

### Step 3: Verify the Fix
1. Go back to the "Scheduled" tab
2. Make sure today's date is selected
3. The lead should now appear in the scheduled list
4. Check console for debug output showing the lead was found and processed

## Expected Debug Output
When clicking the "Scheduled" tab, you should see:
- `🔍 DEBUG: Scheduled leads query returned X documents`
- `📋 DEBUG: Processing scheduled lead:` (for each lead)
- `📊 DEBUG: Processed scheduled leads data:`
- `📅 DEBUG: Date filter check:` (when filtering by date)

## What to Look For
✅ **Success Indicators:**
- Scheduled leads appear in the Scheduled tab
- Debug output shows leads being found and processed
- Date filtering works correctly (leads show for correct dates)
- New "scheduled" disposition option appears in modal

❌ **Failure Indicators:**
- No debug output (indicates code isn't running)
- Query returns 0 documents (no scheduled leads found)
- Leads found but not displayed (date filtering issue)
- "scheduled" option missing from disposition modal

## If Issues Persist
1. Check that leads have `scheduledAppointmentTime` field
2. Verify lead `status` is one of: "scheduled", "rescheduled", "needs_verification"  
3. Confirm lead `teamId` matches current user's team
4. Check that selected date matches appointment date (timezone issues?)

## Files Modified
- `/src/components/dashboard/lead-queue.tsx` - Added debug logging
- `/src/components/dashboard/lead-disposition-modal.tsx` - Added "scheduled" status option
