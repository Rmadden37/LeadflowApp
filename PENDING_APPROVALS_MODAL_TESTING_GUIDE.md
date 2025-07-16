# 🧪 PENDING APPROVALS MODAL - TESTING GUIDE

## 🎯 **QUICK TESTING CHECKLIST**

### **Prerequisites**
1. Have a manager or admin account logged in
2. Have some pending user approvals in the system
3. Development server running on localhost

---

## 📍 **WHERE TO FIND THE MODAL**

### **Location 1: Team User Management**
- **URL:** `/dashboard/manage-teams` or team management page
- **Button:** Orange gradient button labeled "Pending Approvals (X)"
- **Position:** Next to "Invite New User" button

### **Location 2: Manage Teams Header**
- **URL:** `/dashboard/manage-teams`
- **Button:** Subtle orange outline button in section header
- **Position:** Top right of "Team Members & Roles" section

---

## 🧪 **TESTING SCENARIOS**

### **Test 1: Modal Opens/Closes**
1. Click "Pending Approvals" button
2. ✅ Modal should open with glassmorphism overlay
3. ✅ Modal title shows "Pending Approvals"
4. ✅ Click outside modal or X button to close
5. ✅ Modal closes smoothly

### **Test 2: Permission Filtering**
1. **As Manager:** Should only see approvals for their team
2. **As Admin:** Should see all pending approvals
3. ✅ Count on button matches items in modal

### **Test 3: User Information Display**
For each pending approval:
- ✅ User avatar/initials display
- ✅ Full name and email shown
- ✅ Phone number (if provided)
- ✅ Company and region info
- ✅ Team assignment visible
- ✅ "Pending" badge shows

### **Test 4: Role Selection**
1. ✅ Dropdown shows available roles
2. **As Manager:** Only see Setter, Closer
3. **As Admin:** See Setter, Closer, Manager, Admin
4. ✅ Default selection is "Setter"
5. ✅ Can change role selection

### **Test 5: Approval Process**
1. Select a role from dropdown
2. Click "Approve as [Role]" button
3. ✅ Loading spinner shows during processing
4. ✅ Success toast notification appears
5. ✅ User disappears from pending list
6. ✅ Count updates on trigger button
7. ✅ User status changes to "active" in database
8. ✅ Team assignment preserved

### **Test 6: Rejection Process**
1. Click "Reject" button on a pending user
2. ✅ Loading spinner shows during processing
3. ✅ Rejection toast notification appears
4. ✅ User disappears from pending list
5. ✅ Count updates on trigger button
6. ✅ User status changes to "rejected" in database

### **Test 7: Real-time Updates**
1. Open modal in two browser tabs
2. Approve/reject a user in one tab
3. ✅ Other tab updates automatically
4. ✅ Count badges update in real-time

### **Test 8: Mobile Responsiveness**
1. Test on mobile device or resize browser
2. ✅ Modal adjusts to screen size
3. ✅ Cards stack properly on mobile
4. ✅ Buttons remain accessible
5. ✅ Text doesn't overflow

### **Test 9: Empty State**
1. When no pending approvals exist:
2. ✅ Button shows "Pending Approvals (0)"
3. ✅ Modal shows "No Pending Approvals" message
4. ✅ Green checkmark icon displays
5. ✅ Appropriate empty state text

### **Test 10: Error Handling**
1. Test with network disconnected
2. ✅ Error toasts show for failed operations
3. ✅ UI doesn't break with missing data
4. ✅ Loading states handle properly

---

## 🔍 **DEBUGGING TIPS**

### **If Modal Doesn't Open**
- Check browser console for JavaScript errors
- Verify user has manager/admin role
- Check if Dialog component is properly imported

### **If No Pending Approvals Show**
- Verify there are actually pending approvals in Firestore
- Check team assignment filters (manager vs admin)
- Look for query/permission issues in console

### **If Approve/Reject Fails**
- Check Firestore rules and permissions
- Verify batch operation isn't failing
- Check network tab for failed requests

### **Database Validation**
- Check `users` collection for status updates
- Verify `pending_approvals` status changes
- Confirm `closers` collection entries for closer+ roles

---

## 📊 **SUCCESS CRITERIA**

✅ **Modal opens smoothly with proper styling**  
✅ **Permission filtering works correctly**  
✅ **All user information displays properly**  
✅ **Role selection functions as expected**  
✅ **Approve/reject operations complete successfully**  
✅ **Real-time updates work across sessions**  
✅ **Mobile interface remains usable**  
✅ **Empty states handle gracefully**  
✅ **Error scenarios don't break UI**  
✅ **Database operations maintain data integrity**

---

## 🚀 **PRODUCTION READINESS**

Once all tests pass, the modal-based approval system is ready for production deployment. The implementation provides a modern, efficient interface that enhances the user experience while maintaining all security and functionality requirements.
