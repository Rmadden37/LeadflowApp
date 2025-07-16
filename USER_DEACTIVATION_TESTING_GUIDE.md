# USER DEACTIVATION TESTING GUIDE

## 🧪 QUICK VALIDATION TESTS

### Test 1: User Deactivation Process
1. **Login as Manager/Admin**
   - Navigate to Team Management → Manage Users
   - Select a test user to deactivate
   - Click on user profile to open modal

2. **Verify Deactivation Controls**
   - ✅ Deactivate button should be visible for managers/admins
   - ✅ Button should be red with "Deactivate User" text
   - ✅ Should NOT be able to deactivate your own account

3. **Perform Deactivation**
   - Click "Deactivate User" button
   - ✅ Should show success toast message
   - ✅ User status should change to "Account Deactivated" 
   - ✅ Status indicator should turn red

### Test 2: System-Wide Filtering
1. **Check Team Lists**
   - Navigate to Team Management
   - ✅ Deactivated user should NOT appear in team member lists
   - ✅ Should be filtered out of operational views

2. **Check Closer Lineup**
   - Navigate to Dashboard → Closer Lineup
   - ✅ Deactivated user should NOT appear in lineup
   - ✅ Should not be available for lead assignments

### Test 3: Login Prevention
1. **Attempt Login as Deactivated User**
   - Logout from current session
   - Try to login with deactivated user credentials
   - ✅ Should display error: "Account Deactivated"
   - ✅ Should NOT allow access to dashboard

2. **Session Termination Test**
   - Have deactivated user logged in on another device
   - Deactivate their account from admin panel
   - ✅ User should be automatically logged out
   - ✅ Should redirect to login page

### Test 4: Profile Editing Restrictions
1. **Open Deactivated User Profile**
   - Access user profile modal for deactivated user
   - ✅ Form fields should be disabled/grayed out
   - ✅ Save button should be disabled
   - ✅ Warning message should be displayed

### Test 5: User Reactivation
1. **Reactivate User**
   - Click "Reactivate User" button (should be green)
   - ✅ Should show success toast message
   - ✅ Status should change to "Account Active"
   - ✅ Status indicator should turn green

2. **Verify Restoration**
   - ✅ User should appear in team lists again
   - ✅ Should be able to login normally
   - ✅ Profile editing should be re-enabled

## 🚨 EDGE CASES TO TEST

### Permission Edge Cases
- ✅ Non-managers cannot see deactivation controls
- ✅ Users cannot deactivate themselves
- ✅ Deactivated users cannot modify profiles

### Database Consistency
- ✅ User status updated in `users` collection
- ✅ Closer record updated in `closers` collection  
- ✅ Proper metadata recorded (timestamps, actors)

### Auto-Assignment Protection
- ✅ Deactivated users skipped in Firebase function
- ✅ Logs show "Skipping deactivated closer" messages
- ✅ Leads assigned to active users only

## 📊 EXPECTED BEHAVIOR SUMMARY

| Action | Expected Result |
|--------|----------------|
| Manager deactivates user | User status → "deactivated", removed from all lists |
| Deactivated user tries to login | Error message, access denied |
| Active session when deactivated | Auto-logout, redirect to login |
| View deactivated user profile | Form disabled, warning displayed |
| Auto-assignment with deactivated user | User skipped, function logs skip |
| Manager reactivates user | Full restoration of access and functionality |

## 🔍 MONITORING COMMANDS

### Check Firebase Function Logs
```bash
firebase functions:log | grep -E "(deactivated|Skipping)"
```

### Verify Database State
```javascript
// In browser console after login
// Check user status
const userDoc = await firebase.firestore().collection('users').doc('USER_ID').get();
console.log('User status:', userDoc.data().status);

// Check closer record
const closerDoc = await firebase.firestore().collection('closers').doc('USER_ID').get();
console.log('Closer deactivated:', closerDoc.data().deactivated);
```

## ✅ VALIDATION CHECKLIST

### Core Functionality
- [ ] Deactivation button works for managers/admins
- [ ] Deactivated users cannot login
- [ ] Users automatically logged out when deactivated
- [ ] System-wide filtering removes deactivated users
- [ ] Auto-assignment skips deactivated users
- [ ] Reactivation restores full functionality

### Security & Permissions
- [ ] Only managers/admins can deactivate users
- [ ] Users cannot deactivate themselves  
- [ ] Proper error messages displayed
- [ ] Database permissions enforced

### UI/UX Quality
- [ ] Clear visual status indicators
- [ ] Appropriate warning messages
- [ ] Form controls properly disabled
- [ ] Toast notifications working

This testing guide ensures the user deactivation system works correctly across all aspects of the application.
