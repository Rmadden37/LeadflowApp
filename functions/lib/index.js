"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualAssignLead = exports.handleCloserStatusChange = exports.assignLeadOnUpdate = exports.updateChatChannelOnTeamUpdate = exports.initializeChatChannelsOnTeamCreate = exports.cleanupOldChatMessages = exports.updateUserRole = exports.inviteUser = exports.selfAssignLead = exports.processScheduledLeadTransitions = exports.processAppointmentReminders = exports.scheduleAppointmentReminder = exports.handleLeadDispositionUpdate = exports.getTeamStats = exports.acceptJob = exports.assignLeadOnCreate = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Push notification function
async function sendPushNotification(userIds, payload) {
    var _a;
    try {
        // Get FCM tokens for all users
        const tokenPromises = userIds.map(async (userId) => {
            var _a;
            const tokensSnapshot = await db.collection("userTokens").doc(userId).get();
            return tokensSnapshot.exists ? ((_a = tokensSnapshot.data()) === null || _a === void 0 ? void 0 : _a.tokens) || [] : [];
        });
        const userTokens = await Promise.all(tokenPromises);
        const allTokens = userTokens.flat();
        if (allTokens.length === 0) {
            functions.logger.warn("No FCM tokens found for notification");
            return;
        }
        // Send to all tokens
        const message = {
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            tokens: allTokens,
        };
        const response = await admin.messaging().sendEachForMulticast(message);
        functions.logger.info(`Notification sent to ${response.successCount} devices`);
        // Clean up invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && allTokens[idx]) {
                    invalidTokens.push(allTokens[idx]);
                }
            });
            // Remove invalid tokens from database
            for (const userId of userIds) {
                const tokensDoc = db.collection("userTokens").doc(userId);
                const tokensSnapshot = await tokensDoc.get();
                if (tokensSnapshot.exists) {
                    const currentTokens = ((_a = tokensSnapshot.data()) === null || _a === void 0 ? void 0 : _a.tokens) || [];
                    const validTokens = currentTokens.filter((token) => !invalidTokens.includes(token));
                    await tokensDoc.update({ tokens: validTokens });
                }
            }
        }
    }
    catch (error) {
        functions.logger.error("Error sending push notification:", error);
    }
}
// Notification service for lead-specific notifications
const LeadNotifications = {
    // When a new lead is created
    newLead: async (lead, assignedUserId) => {
        const userIds = assignedUserId ? [assignedUserId] : [];
        await sendPushNotification(userIds, {
            title: '🔥 New Lead!',
            body: `${lead.customerName} from ${lead.address} - ${lead.customerPhone}`,
            tag: `new-lead-${lead.id}`,
            data: {
                type: 'new_lead',
                leadId: lead.id,
                actionUrl: `/dashboard`
            }
        });
    },
    // When a lead is assigned to someone  
    leadAssigned: async (lead, assignedUserId) => {
        await sendPushNotification([assignedUserId], {
            title: '📋 Lead Assigned to You',
            body: `${lead.customerName} has been assigned to you`,
            tag: `assigned-${lead.id}`,
            data: {
                type: 'lead_assigned',
                leadId: lead.id,
                actionUrl: `/dashboard`
            }
        });
    },
    // When a closer accepts a job
    jobAccepted: async (lead, setterId, closerName) => {
        await sendPushNotification([setterId], {
            title: '✅ Job Accepted!',
            body: `${closerName} has accepted the job for ${lead.customerName}`,
            tag: `accepted-${lead.id}`,
            data: {
                type: 'job_accepted',
                leadId: lead.id,
                closerName: closerName,
                actionUrl: `/dashboard`
            }
        });
    },
    // When a lead is updated
    leadUpdated: async (lead, assignedUserId, newStatus) => {
        const statusEmoji = getStatusEmoji(newStatus);
        await sendPushNotification([assignedUserId], {
            title: `${statusEmoji} Lead Updated`,
            body: `${lead.customerName} - Status changed to ${newStatus}`,
            tag: `updated-${lead.id}`,
            data: {
                type: 'lead_updated',
                leadId: lead.id,
                status: newStatus,
                actionUrl: `/dashboard`
            }
        });
    },
    // Appointment reminder
    appointmentReminder: async (lead, assignedUserId, appointmentTime) => {
        const timeString = appointmentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        await sendPushNotification([assignedUserId], {
            title: '⏰ Appointment Reminder',
            body: `Appointment with ${lead.customerName} at ${timeString}`,
            tag: `reminder-${lead.id}`,
            data: {
                type: 'appointment_reminder',
                leadId: lead.id,
                appointmentTime: appointmentTime.toISOString(),
                actionUrl: `/dashboard`
            }
        });
    }
};
// Helper function to get emoji for status
function getStatusEmoji(status) {
    switch (status) {
        case 'sold': return '💰';
        case 'no_sale': return '❌';
        case 'scheduled': return '📅';
        case 'rescheduled': return '🔄';
        case 'canceled': return '⛔';
        case 'accepted': return '✅';
        case 'in_process': return '🔄';
        default: return '📋';
    }
}
/**
 * Smart lead assignment algorithm
 * Priority order:
 * 1. On Duty closers only
 * 2. Same team as the lead
 * 3. Only closers with ZERO current assignments (strict round-robin)
 * 4. Lowest lineup order (rotation system)
 */
async function getNextAvailableCloser(teamId) {
    try {
        functions.logger.info(`🔍 Finding next available closer for team ${teamId}`);
        // Get all on-duty closers for the team
        const closersSnapshot = await db
            .collection("closers")
            .where("teamId", "==", teamId)
            .where("status", "==", "On Duty")
            .orderBy("lineupOrder", "asc")
            .get();
        if (closersSnapshot.empty) {
            functions.logger.warn(`❌ No on-duty closers found for team ${teamId}`);
            return null;
        }
        const availableClosers = [];
        closersSnapshot.forEach((doc) => {
            availableClosers.push(Object.assign({ uid: doc.id }, doc.data()));
        });
        functions.logger.info(`👥 Found ${availableClosers.length} on-duty closers for team ${teamId}`);
        // Get current lead assignments for each closer
        const closerAssignments = new Map();
        for (const closer of availableClosers) {
            const assignedLeadsSnapshot = await db
                .collection("leads")
                .where("assignedCloserId", "==", closer.uid)
                .where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
                .get();
            // Count only leads that are properly assigned (scheduled leads must be verified)
            let validAssignmentCount = 0;
            assignedLeadsSnapshot.forEach((doc) => {
                const leadData = doc.data();
                if (leadData.status === "scheduled" && !leadData.setterVerified) {
                    // Don't count unverified scheduled leads towards assignment limit
                    return;
                }
                validAssignmentCount++;
            });
            closerAssignments.set(closer.uid, validAssignmentCount);
            functions.logger.info(`📊 Closer ${closer.name}: ${validAssignmentCount} active assignments`);
        }
        // Filter out closers who already have assignments
        const availableUnassignedClosers = availableClosers.filter(closer => (closerAssignments.get(closer.uid) || 0) === 0);
        if (availableUnassignedClosers.length === 0) {
            functions.logger.warn(`⚠️ All closers are assigned for team ${teamId}`);
            return null;
        }
        // Sort by lineup order (since all have zero assignments)
        availableUnassignedClosers.sort((a, b) => {
            const orderA = a.lineupOrder || 999999;
            const orderB = b.lineupOrder || 999999;
            return orderA - orderB; // Primary sort by lineup order
        });
        const selectedCloser = availableUnassignedClosers[0];
        functions.logger.info(`✅ Selected closer ${selectedCloser.name} (order: ${selectedCloser.lineupOrder}) for team ${teamId}`);
        return selectedCloser;
    }
    catch (error) {
        functions.logger.error("❌ Error getting next available closer:", error);
        return null;
    }
}
/**
 * Assign a lead to a closer
 */
async function assignLeadToCloser(leadId, lead, closer) {
    try {
        const leadRef = db.collection("leads").doc(leadId);
        // For scheduled leads, check if they require verification before assignment
        let targetStatus = lead.dispatchType === "immediate" ? "waiting_assignment" : "scheduled";
        // If this is a scheduled lead that's already verified, it can go to waiting_assignment
        if (lead.status === "scheduled" && lead.setterVerified === true) {
            targetStatus = "waiting_assignment";
        }
        await leadRef.update({
            assignedCloserId: closer.uid,
            assignedCloserName: closer.name,
            status: targetStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`✅ Lead ${leadId} assigned to closer ${closer.name} (${closer.uid}) with status ${targetStatus}`);
        // Send lead assignment notification
        try {
            await LeadNotifications.leadAssigned(Object.assign(Object.assign({}, lead), { id: leadId, assignedCloserId: closer.uid, assignedCloserName: closer.name }), closer.uid);
        }
        catch (notificationError) {
            functions.logger.error(`❌ Error sending lead assignment notification:`, notificationError);
        }
        // Optional: Create a notification or activity log
        await db.collection("activities").add({
            type: "lead_assigned",
            leadId: leadId,
            closerId: closer.uid,
            closerName: closer.name,
            customerName: lead.customerName,
            teamId: lead.teamId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        functions.logger.error(`❌ Error assigning lead ${leadId} to closer ${closer.uid}:`, error);
        throw error;
    }
}
/**
 * Cloud Function triggered when a lead is created
 * Automatically assigns the lead to an available closer
 */
exports.assignLeadOnCreate = functions.firestore
    .document("leads/{leadId}")
    .onCreate(async (snap, context) => {
    const leadId = context.params.leadId;
    const leadData = snap.data();
    functions.logger.info(`🚀 New lead created: ${leadId} (${leadData.customerName}) for team ${leadData.teamId}`);
    // Only auto-assign leads that don't already have a closer assigned
    if (leadData.assignedCloserId) {
        functions.logger.info(`⏸️ Lead ${leadId} already has a closer assigned: ${leadData.assignedCloserName}`);
        return null;
    }
    // Only auto-assign leads in waiting_assignment status
    if (leadData.status !== "waiting_assignment") {
        functions.logger.info(`⏸️ Lead ${leadId} status is ${leadData.status}, not auto-assigning`);
        return null;
    }
    try {
        const availableCloser = await getNextAvailableCloser(leadData.teamId);
        if (!availableCloser) {
            functions.logger.warn(`⚠️ No available closers for new lead ${leadId} in team ${leadData.teamId}`);
            // Optionally, you could create a notification for managers here
            return null;
        }
        await assignLeadToCloser(leadId, leadData, availableCloser);
        functions.logger.info(`✅ Successfully assigned new lead ${leadId} to closer ${availableCloser.name}`);
        return null;
    }
    catch (error) {
        functions.logger.error(`❌ Error in assignLeadOnCreate for lead ${leadId}:`, error);
        return null; // Don't re-throw to prevent retries for now
    }
});
/**
 * FIXED Accept a job (callable function)
 * Called when a closer clicks on their assigned lead for the first time
 * Enhanced to support managers/admins accepting on behalf of closers
 */
exports.acceptJob = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { leadId } = data;
    if (!leadId) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID is required");
    }
    try {
        functions.logger.info(`🚀 AcceptJob called for lead ${leadId} by user ${context.auth.uid}`);
        // Get the lead and user documents in parallel for efficiency
        const [leadDoc, userDoc] = await Promise.all([
            db.collection("leads").doc(leadId).get(),
            db.collection("users").doc(context.auth.uid).get()
        ]);
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        if (!userDoc.exists) {
            throw new functions.https.HttpsError("not-found", "User not found");
        }
        const leadData = leadDoc.data();
        const userData = userDoc.data();
        const userRole = userData === null || userData === void 0 ? void 0 : userData.role;
        functions.logger.info(`User: ${context.auth.uid}, Role: ${userRole}, Team: ${userData === null || userData === void 0 ? void 0 : userData.teamId}`);
        functions.logger.info(`Lead: ${leadId}, Status: ${leadData.status}, AssignedTo: ${leadData.assignedCloserId}, Team: ${leadData.teamId}`);
        // ENHANCED PERMISSION LOGIC - This is the key fix
        let hasPermission = false;
        let permissionReason = "";
        // Check permissions based on role
        if (userRole === "admin") {
            // Admins can accept ANY lead
            hasPermission = true;
            permissionReason = "Admin has unrestricted access";
        }
        else if (userRole === "manager") {
            // Managers can accept leads in their team
            if (leadData.teamId === (userData === null || userData === void 0 ? void 0 : userData.teamId)) {
                hasPermission = true;
                permissionReason = "Manager accepting lead in their team";
            }
            else {
                hasPermission = false;
                permissionReason = `Manager team mismatch: user team ${userData === null || userData === void 0 ? void 0 : userData.teamId} vs lead team ${leadData.teamId}`;
            }
        }
        else if (userRole === "closer") {
            // Closers can only accept leads assigned to them
            if (leadData.assignedCloserId === context.auth.uid) {
                hasPermission = true;
                permissionReason = "Closer accepting their assigned lead";
            }
            else {
                hasPermission = false;
                permissionReason = `Closer not assigned: assigned to ${leadData.assignedCloserId}, user is ${context.auth.uid}`;
            }
        }
        else {
            hasPermission = false;
            permissionReason = `Invalid role: ${userRole}`;
        }
        functions.logger.info(`Permission check: ${hasPermission}, Reason: ${permissionReason}`);
        if (!hasPermission) {
            throw new functions.https.HttpsError("permission-denied", permissionReason);
        }
        // Check if the job has already been accepted
        if (leadData.status === "accepted" || leadData.acceptedAt) {
            functions.logger.info(`Lead ${leadId} already accepted`);
            return {
                success: true,
                alreadyAccepted: true,
                message: "Job was already accepted"
            };
        }
        // Validate lead status for acceptance
        const validStatuses = ["waiting_assignment", "scheduled"];
        if (!validStatuses.includes(leadData.status)) {
            throw new functions.https.HttpsError("failed-precondition", `Cannot accept job with status: ${leadData.status}. Valid statuses: ${validStatuses.join(", ")}`);
        }
        // Additional check for scheduled leads - they must be verified
        if (leadData.status === "scheduled" && !leadData.setterVerified) {
            throw new functions.https.HttpsError("failed-precondition", "Cannot accept scheduled appointment - setter verification required");
        }
        // Update the lead to accepted status
        const updateData = {
            status: "accepted",
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            acceptedBy: context.auth.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection("leads").doc(leadId).update(updateData);
        functions.logger.info(`✅ Lead ${leadId} accepted by user ${context.auth.uid} (${userRole})`);
        // Send notification to the setter if setterId exists
        if (leadData.setterId) {
            try {
                // Get closer info for notification - use assigned closer's name, not the accepter
                const closerDoc = await db.collection("closers").doc(leadData.assignedCloserId).get();
                const closerName = closerDoc.exists ? ((_a = closerDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "Closer" : "Closer";
                await LeadNotifications.jobAccepted(Object.assign(Object.assign({}, leadData), { id: leadId, status: "accepted", acceptedAt: admin.firestore.Timestamp.now(), acceptedBy: context.auth.uid }), leadData.setterId, closerName);
            }
            catch (notificationError) {
                functions.logger.error(`Error sending job acceptance notification:`, notificationError);
                // Don't fail the function if notification fails
            }
        }
        // Create activity log with enhanced metadata
        await db.collection("activities").add({
            type: "job_accepted",
            leadId: leadId,
            closerId: leadData.assignedCloserId, // The actual assigned closer
            acceptedBy: context.auth.uid, // Who performed the acceptance (could be admin/manager)
            acceptedByRole: userRole, // Role of person who accepted
            closerName: leadData.assignedCloserName,
            customerName: leadData.customerName,
            teamId: leadData.teamId,
            isManagerAcceptance: userRole === "manager",
            isAdminAcceptance: userRole === "admin",
            onBehalfOf: (userRole === "manager" || userRole === "admin") ? leadData.assignedCloserId : null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        const successMessage = (userRole === "manager" || userRole === "admin")
            ? `Job accepted on behalf of ${leadData.assignedCloserName || "closer"}`
            : "Job accepted successfully";
        return {
            success: true,
            alreadyAccepted: false,
            acceptedAt: new Date().toISOString(),
            acceptedBy: context.auth.uid,
            acceptedByRole: userRole,
            onBehalfOf: (userRole === "manager" || userRole === "admin") ? leadData.assignedCloserId : null,
            message: successMessage
        };
    }
    catch (error) {
        functions.logger.error(`❌ Error in acceptJob for lead ${leadId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error occurred");
    }
});
/**
 * Get team statistics (callable function)
 * Returns lead assignment statistics for a team
 */
exports.getTeamStats = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { teamId } = data;
    if (!teamId) {
        throw new functions.https.HttpsError("invalid-argument", "Team ID is required");
    }
    try {
        // Verify user has permission
        const userDoc = await db.collection("users").doc(context.auth.uid).get();
        const userData = userDoc.data();
        if (!userData || (userData.teamId !== teamId && userData.role !== "manager" && userData.role !== "admin")) {
            throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
        }
        // Get team stats
        const [leadsSnapshot, closersSnapshot] = await Promise.all([
            db.collection("leads").where("teamId", "==", teamId).get(),
            db.collection("closers").where("teamId", "==", teamId).get(),
        ]);
        const leadsByStatus = {};
        const leadsByCloser = {};
        leadsSnapshot.forEach((doc) => {
            const lead = doc.data();
            leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
            if (lead.assignedCloserId) {
                leadsByCloser[lead.assignedCloserId] = (leadsByCloser[lead.assignedCloserId] || 0) + 1;
            }
        });
        const closerStats = closersSnapshot.docs.map((doc) => {
            const closer = doc.data();
            return {
                uid: closer.uid,
                name: closer.name,
                status: closer.status,
                assignedLeads: leadsByCloser[closer.uid] || 0,
            };
        });
        return {
            teamId,
            totalLeads: leadsSnapshot.size,
            leadsByStatus,
            closers: closerStats,
            onDutyClosers: closerStats.filter(c => c.status === "On Duty").length,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
    }
    catch (error) {
        functions.logger.error(`Error in getTeamStats for team ${teamId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
/**
 * Cloud Function triggered when a lead is updated
 * Handles round robin rotation logic:
 * - Moves closers to FRONT of lineup for exceptions (canceled/rescheduled leads)
 * - Moves closers to BOTTOM of lineup for completed jobs (sold/no_sale/credit_fail)
 * Also sends notifications for status changes
 */
exports.handleLeadDispositionUpdate = functions.firestore
    .document("leads/{leadId}")
    .onUpdate(async (change, context) => {
    const leadId = context.params.leadId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Send notification if status changed and lead has an assigned closer
    if (beforeData.status !== afterData.status && afterData.assignedCloserId) {
        try {
            await LeadNotifications.leadUpdated(Object.assign(Object.assign({}, afterData), { id: leadId }), afterData.assignedCloserId, afterData.status);
        }
        catch (notificationError) {
            functions.logger.error(`Error sending lead update notification:`, notificationError);
        }
    }
    // Check if status changed for round robin logic
    const wasExceptionDisposition = (beforeData.status === "in_process" || beforeData.status === "accepted") &&
        (afterData.status === "canceled" || afterData.status === "rescheduled");
    // Completed dispositions: Accept transitions from waiting_assignment, accepted, or in_process to final states
    const wasCompletedDisposition = (beforeData.status === "in_process" ||
        beforeData.status === "accepted" ||
        beforeData.status === "waiting_assignment" // ← Added this to handle direct dispositions
    ) && (afterData.status === "sold" || afterData.status === "no_sale" || afterData.status === "credit_fail");
    // Check for any other disposition that should move closer to back of lineup
    const wasOtherDisposition = (beforeData.status === "in_process" || beforeData.status === "accepted") &&
        !wasExceptionDisposition &&
        (afterData.status !== beforeData.status); // Any status change that's not an exception
    if (!wasExceptionDisposition && !wasCompletedDisposition && !wasOtherDisposition) {
        return null; // No action needed for round robin
    }
    const assignedCloserId = beforeData.assignedCloserId || afterData.assignedCloserId;
    if (!assignedCloserId) {
        functions.logger.info(`Lead ${leadId} disposition updated but no assigned closer found`);
        return null;
    }
    const isExceptionDisposition = wasExceptionDisposition;
    functions.logger.info(`Lead ${leadId} was ${afterData.status}, implementing ${isExceptionDisposition ? 'exception' : 'completion'} rotation for closer ${assignedCloserId}`);
    try {
        // Get the closer's current lineup order
        const closerDoc = await db.collection("closers").doc(assignedCloserId).get();
        if (!closerDoc.exists) {
            functions.logger.warn(`Closer ${assignedCloserId} not found for round robin rotation`);
            return null;
        }
        const closerData = closerDoc.data();
        const teamId = closerData.teamId;
        // Get all closers in the team to find the appropriate lineup order position
        const teamClosersSnapshot = await db
            .collection("closers")
            .where("teamId", "==", teamId)
            .orderBy("lineupOrder", isExceptionDisposition ? "asc" : "desc")
            .get();
        if (teamClosersSnapshot.empty) {
            functions.logger.warn(`No closers found for team ${teamId}`);
            return null;
        }
        // Find the appropriate lineup order and calculate new order for the closer
        const allClosers = teamClosersSnapshot.docs.map(doc => (Object.assign({ uid: doc.id }, doc.data())));
        let newLineupOrder;
        let logMessage;
        let activityType;
        if (isExceptionDisposition) {
            // Move to front for exceptions (canceled/rescheduled)
            const minLineupOrder = allClosers[0].lineupOrder || 0;
            newLineupOrder = Math.max(0, minLineupOrder - 1000); // Place them at front with buffer
            logMessage = `Moved closer ${assignedCloserId} to front of lineup (order: ${newLineupOrder}) due to ${afterData.status} lead ${leadId}`;
            activityType = "round_robin_exception";
        }
        else {
            // Move to bottom for all other dispositions (sold/no_sale/credit_fail and any other disposition)
            const maxLineupOrder = allClosers[0].lineupOrder || 0;
            newLineupOrder = maxLineupOrder + 1000; // Place them at bottom with buffer
            logMessage = `Moved closer ${assignedCloserId} to bottom of lineup (order: ${newLineupOrder}) due to ${afterData.status} lead ${leadId}`;
            activityType = "round_robin_completion";
        }
        // Update the closer's lineup order
        await db.collection("closers").doc(assignedCloserId).update({
            lineupOrder: newLineupOrder,
            lastExceptionTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            lastExceptionReason: `Lead ${leadId} ${afterData.status}`,
        });
        functions.logger.info(logMessage);
        // Create an activity log for the rotation
        await db.collection("activities").add({
            type: activityType,
            leadId: leadId,
            closerId: assignedCloserId,
            closerName: closerData.name,
            reason: afterData.status,
            previousLineupOrder: closerData.lineupOrder,
            newLineupOrder: newLineupOrder,
            teamId: teamId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
    }
    catch (error) {
        functions.logger.error(`Error in handleLeadDispositionUpdate rotation for lead ${leadId}:`, error);
        // Log the error but don't throw to avoid retries
        await db.collection("function_errors").add({
            function: "handleLeadDispositionUpdate",
            leadId: leadId,
            closerId: assignedCloserId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
    }
});
/**
 * Cloud Function to schedule appointment reminders
 * Triggered when a lead is scheduled or rescheduled
 */
exports.scheduleAppointmentReminder = functions.firestore
    .document("leads/{leadId}")
    .onUpdate(async (change, context) => {
    const leadId = context.params.leadId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if scheduledAppointmentTime was added or changed
    const hadScheduledTime = beforeData.scheduledAppointmentTime;
    const hasScheduledTime = afterData.scheduledAppointmentTime;
    if (!hasScheduledTime || !afterData.assignedCloserId) {
        return null; // No scheduled time or no assigned closer
    }
    // Only process if the scheduled time changed or was newly added
    const timeChanged = !hadScheduledTime ||
        (hadScheduledTime && hasScheduledTime &&
            hadScheduledTime.toMillis() !== hasScheduledTime.toMillis());
    if (!timeChanged) {
        return null; // No change in scheduled time
    }
    const appointmentTime = hasScheduledTime.toDate();
    const now = new Date();
    const reminderTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000); // 30 minutes before
    // Only schedule if reminder time is in the future
    if (reminderTime <= now) {
        functions.logger.info(`Appointment reminder time for lead ${leadId} is in the past, skipping`);
        return null;
    }
    try {
        // Store reminder task in Firestore to be processed by a scheduled function
        await db.collection("appointmentReminders").add({
            leadId: leadId,
            assignedCloserId: afterData.assignedCloserId,
            appointmentTime: hasScheduledTime,
            reminderTime: admin.firestore.Timestamp.fromDate(reminderTime),
            customerName: afterData.customerName,
            address: afterData.address,
            processed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Scheduled appointment reminder for lead ${leadId} at ${reminderTime.toISOString()}`);
    }
    catch (error) {
        functions.logger.error(`Error scheduling appointment reminder for lead ${leadId}:`, error);
    }
    return null;
});
/**
 * Scheduled function to process appointment reminders
 * Runs every 5 minutes to check for due reminders
 */
exports.processAppointmentReminders = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    try {
        // Get all unprocessed reminders that are due
        const dueReminders = await db
            .collection("appointmentReminders")
            .where("processed", "==", false)
            .where("reminderTime", "<=", now)
            .limit(50) // Process in batches
            .get();
        if (dueReminders.empty) {
            functions.logger.info("No appointment reminders to process");
            return null;
        }
        const batch = db.batch();
        const notificationPromises = [];
        for (const reminderDoc of dueReminders.docs) {
            const reminder = reminderDoc.data();
            // Send notification
            notificationPromises.push(LeadNotifications.appointmentReminder({
                id: reminder.leadId,
                customerName: reminder.customerName,
                address: reminder.address || '',
            }, reminder.assignedCloserId, reminder.appointmentTime.toDate()));
            // Mark as processed
            batch.update(reminderDoc.ref, { processed: true });
        }
        // Execute all operations
        await Promise.all([
            batch.commit(),
            ...notificationPromises
        ]);
        functions.logger.info(`Processed ${dueReminders.size} appointment reminders`);
    }
    catch (error) {
        functions.logger.error("Error processing appointment reminders:", error);
    }
    return null;
});
/**
 * Scheduled function to process 45-minute lead transitions
 * Runs every 2 minutes to check for verified scheduled leads that should move to waiting_assignment
 * 45 minutes before their appointment time
 */
exports.processScheduledLeadTransitions = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const currentTime = now.toDate();
    const fortyFiveMinutesFromNow = new Date(currentTime.getTime() + (45 * 60 * 1000));
    try {
        functions.logger.info(`🔄 Processing scheduled lead transitions at ${currentTime.toISOString()}`);
        // Get all verified scheduled leads that have appointments within 45 minutes
        const scheduledLeadsQuery = await db
            .collection("leads")
            .where("status", "in", ["scheduled", "rescheduled"])
            .where("setterVerified", "==", true)
            .where("scheduledAppointmentTime", "<=", admin.firestore.Timestamp.fromDate(fortyFiveMinutesFromNow))
            .where("scheduledAppointmentTime", ">", now)
            .limit(100) // Process in batches
            .get();
        if (scheduledLeadsQuery.empty) {
            functions.logger.info("ℹ️ No scheduled leads ready for 45-minute transition");
            return null;
        }
        const batch = db.batch();
        let transitionCount = 0;
        scheduledLeadsQuery.docs.forEach((leadDoc) => {
            var _a;
            const leadData = leadDoc.data();
            const appointmentTime = (_a = leadData.scheduledAppointmentTime) === null || _a === void 0 ? void 0 : _a.toDate();
            if (!appointmentTime) {
                functions.logger.warn(`⚠️ Lead ${leadDoc.id} has no appointment time, skipping`);
                return;
            }
            const timeUntilAppointment = appointmentTime.getTime() - currentTime.getTime();
            const minutesUntilAppointment = Math.floor(timeUntilAppointment / (60 * 1000));
            // Only transition if within 45 minutes and verified
            if (timeUntilAppointment <= (45 * 60 * 1000) && timeUntilAppointment > 0 && leadData.setterVerified) {
                functions.logger.info(`⏭️ Moving verified lead ${leadDoc.id} (${leadData.customerName}) to waiting assignment - ${minutesUntilAppointment} minutes until appointment`);
                batch.update(leadDoc.ref, {
                    status: "waiting_assignment",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    transitionedToWaitingAt: admin.firestore.FieldValue.serverTimestamp(),
                    transitionReason: "45_minute_rule"
                });
                transitionCount++;
            }
        });
        if (transitionCount > 0) {
            await batch.commit();
            functions.logger.info(`✅ Successfully transitioned ${transitionCount} verified scheduled leads to waiting assignment`);
            // Create activity log for monitoring
            await db.collection("activities").add({
                type: "scheduled_lead_transition",
                count: transitionCount,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                reason: "45_minute_rule",
                description: `Automatically moved ${transitionCount} verified scheduled leads to waiting assignment`
            });
        }
        else {
            functions.logger.info("ℹ️ No leads needed transition at this time");
        }
    }
    catch (error) {
        functions.logger.error("❌ Error processing scheduled lead transitions:", error);
    }
    return null;
});
/**
 * Self-assign a lead (callable function)
 * Allows closers to assign waiting leads to themselves
 */
exports.selfAssignLead = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { leadId } = data;
    if (!leadId) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID is required");
    }
    try {
        const leadDoc = await db.collection("leads").doc(leadId).get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        const leadData = leadDoc.data();
        // Verify user has permission (same team and is a closer or manager)
        const userDoc = await db.collection("users").doc(context.auth.uid).get();
        const userData = userDoc.data();
        if (!userData || userData.teamId !== leadData.teamId) {
            throw new functions.https.HttpsError("permission-denied", "You can only assign leads from your team");
        }
        if (!["closer", "manager"].includes(userData.role || "")) {
            throw new functions.https.HttpsError("permission-denied", "Only closers and managers can self-assign leads");
        }
        // Check if lead is available for assignment
        if (leadData.status !== "waiting_assignment") {
            // Allow self-assignment of scheduled leads only if they are verified
            if (leadData.status === "scheduled" && leadData.setterVerified === true) {
                // This is allowed - verified scheduled leads can be self-assigned
            }
            else {
                throw new functions.https.HttpsError("invalid-argument", leadData.status === "scheduled"
                    ? "Scheduled leads must be verified by the setter before they can be assigned"
                    : "Lead is not available for assignment");
            }
        }
        if (leadData.assignedCloserId) {
            throw new functions.https.HttpsError("invalid-argument", "Lead is already assigned to another closer");
        }
        // Check if closer is on duty
        const closerDoc = await db.collection("closers").doc(context.auth.uid).get();
        if (!closerDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Closer profile not found");
        }
        const closerData = closerDoc.data();
        if (closerData.status !== "On Duty") {
            throw new functions.https.HttpsError("invalid-argument", "You must be on duty to self-assign leads");
        }
        // Assign the lead to the current user
        await assignLeadToCloser(leadId, leadData, {
            uid: context.auth.uid,
            name: closerData.name,
            status: closerData.status,
            teamId: closerData.teamId,
        });
        return {
            success: true,
            assignedCloser: {
                uid: context.auth.uid,
                name: closerData.name,
            },
        };
    }
    catch (error) {
        functions.logger.error(`Error in selfAssignLead for lead ${leadId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
/**
 * Invite User Function - Allows managers to invite new users to their team
 */
exports.inviteUser = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e;
    try {
        functions.logger.info("=== INVITE USER FUNCTION STARTED ===");
        functions.logger.info("Request data:", {
            email: data.email,
            role: data.role,
            teamId: data.teamId,
            hasDisplayName: !!data.displayName,
            hasPhoneNumber: !!data.phoneNumber,
            hasTempPassword: !!data.tempPassword,
            tempPasswordLength: (_a = data.tempPassword) === null || _a === void 0 ? void 0 : _a.length
        });
        // Check authentication
        if (!context.auth) {
            functions.logger.error("Authentication failed - no context.auth");
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }
        const inviterId = context.auth.uid;
        functions.logger.info("Inviter ID:", inviterId);
        // Get the inviter's data to check role and team
        const inviterDoc = await db.collection("users").doc(inviterId).get();
        if (!inviterDoc.exists) {
            functions.logger.error("Inviter user not found:", inviterId);
            throw new functions.https.HttpsError("not-found", "Inviter user not found");
        }
        const inviterData = inviterDoc.data();
        functions.logger.info("Inviter data:", {
            role: inviterData === null || inviterData === void 0 ? void 0 : inviterData.role,
            teamId: inviterData === null || inviterData === void 0 ? void 0 : inviterData.teamId,
            email: inviterData === null || inviterData === void 0 ? void 0 : inviterData.email
        });
        if ((inviterData === null || inviterData === void 0 ? void 0 : inviterData.role) !== "manager" && (inviterData === null || inviterData === void 0 ? void 0 : inviterData.role) !== "admin") {
            functions.logger.error("Permission denied - inviter is not a manager or admin:", inviterData === null || inviterData === void 0 ? void 0 : inviterData.role);
            throw new functions.https.HttpsError("permission-denied", "Only managers and admins can invite users");
        }
        const { email, displayName, phoneNumber, tempPassword, role, teamId } = data;
        // Validate input
        if (!email || !role || !tempPassword || !teamId) {
            throw new functions.https.HttpsError("invalid-argument", "Email, role, teamId, and temporary password are required");
        }
        if (tempPassword.length < 6) {
            throw new functions.https.HttpsError("invalid-argument", "Temporary password must be at least 6 characters");
        }
        if (!["setter", "closer", "manager", "admin"].includes(role)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
        }
        // Validate that the teamId is provided and exists
        if (!teamId) {
            throw new functions.https.HttpsError("invalid-argument", "Team ID is required");
        }
        // Verify the team exists and is active
        const teamDoc = await db.collection("teams").doc(teamId).get();
        if (!teamDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Specified team not found");
        }
        const teamData = teamDoc.data();
        if (!(teamData === null || teamData === void 0 ? void 0 : teamData.isActive)) {
            throw new functions.https.HttpsError("invalid-argument", "Cannot assign users to inactive teams");
        }
        // For now, allow managers to assign to any active team
        // In the future, you might want to restrict managers to their own team
        functions.logger.info(`Assigning user to team: ${teamId} (${teamData.name})`);
        // Check if user already exists in Firebase Auth or Firestore
        let existingUser;
        try {
            existingUser = await admin.auth().getUserByEmail(email);
        }
        catch (error) {
            if (error.code !== "auth/user-not-found") {
                functions.logger.error("Error checking existing user:", error);
                throw new functions.https.HttpsError("internal", "Failed to check existing user");
            }
        }
        if (existingUser) {
            // Check if they're already in our system
            const existingUserDoc = await db.collection("users").doc(existingUser.uid).get();
            if (existingUserDoc.exists) {
                const existingData = existingUserDoc.data();
                if ((existingData === null || existingData === void 0 ? void 0 : existingData.teamId) === (inviterData === null || inviterData === void 0 ? void 0 : inviterData.teamId)) {
                    throw new functions.https.HttpsError("already-exists", "This user is already a member of your team");
                }
                else {
                    throw new functions.https.HttpsError("failed-precondition", "This user is already a member of another team");
                }
            }
        }
        // Create the user in Firebase Auth if they don't exist
        let newUser;
        if (!existingUser) {
            newUser = await admin.auth().createUser({
                email: email,
                displayName: displayName || undefined,
                password: tempPassword,
                emailVerified: false,
            });
        }
        else {
            newUser = existingUser;
            // Update password for existing user
            await admin.auth().updateUser(newUser.uid, {
                password: tempPassword,
            });
        }
        // Create user document in Firestore
        const userData = {
            uid: newUser.uid,
            email: email,
            displayName: displayName || null,
            role: role,
            teamId: teamId, // Use the provided teamId instead of inviter's teamId
            avatarUrl: null,
            phoneNumber: phoneNumber || null,
            status: role === "closer" ? "Off Duty" : undefined,
        };
        await db.collection("users").doc(newUser.uid).set(userData);
        // If the new user is a closer, manager, or admin, create their closer record
        if (role === "closer" || role === "manager" || role === "admin") {
            const closerData = {
                uid: newUser.uid,
                name: displayName || email,
                status: "Off Duty",
                teamId: teamId, // Use the provided teamId instead of inviter's teamId
                role: role,
                avatarUrl: null,
                phone: phoneNumber || null,
                lineupOrder: 999, // Will be normalized later
            };
            await db.collection("closers").doc(newUser.uid).set(closerData);
        }
        // Note: We don't send a password reset email since we're setting the password directly
        functions.logger.info(`User invited successfully: ${email} as ${role} by manager ${inviterId}`);
        return {
            success: true,
            message: `User ${email} has been successfully added to your team with the provided credentials.`,
            userId: newUser.uid,
        };
    }
    catch (error) {
        functions.logger.error("Invite user error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Provide more specific error messages based on the error type
        let errorMessage = "Failed to invite user";
        if ((error === null || error === void 0 ? void 0 : error.code) === 'auth/email-already-exists') {
            errorMessage = "A user with this email already exists in Firebase Auth";
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'auth/invalid-email') {
            errorMessage = "Invalid email address provided";
        }
        else if ((error === null || error === void 0 ? void 0 : error.code) === 'auth/weak-password') {
            errorMessage = "The temporary password is too weak";
        }
        else if ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('permission')) {
            errorMessage = "Permission denied - insufficient privileges to invite users";
        }
        else if (((_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.includes('network')) || ((_d = error === null || error === void 0 ? void 0 : error.message) === null || _d === void 0 ? void 0 : _d.includes('timeout'))) {
            errorMessage = "Network error - please check your connection and try again";
        }
        else if ((_e = error === null || error === void 0 ? void 0 : error.message) === null || _e === void 0 ? void 0 : _e.includes('quota')) {
            errorMessage = "Service quota exceeded - please try again later";
        }
        else if (error === null || error === void 0 ? void 0 : error.message) {
            // Include the actual error message for debugging
            errorMessage = `Failed to invite user: ${error.message}`;
        }
        throw new functions.https.HttpsError("internal", errorMessage);
    }
});
/**
 * Update User Role Function - Allows managers to update user roles
 */
exports.updateUserRole = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        functions.logger.info("=== UPDATE USER ROLE FUNCTION STARTED ===");
        functions.logger.info("Request data:", {
            email: data.email,
            targetRole: data.targetRole,
            teamId: data.teamId
        });
        // Check authentication
        if (!context.auth) {
            functions.logger.error("Authentication failed - no context.auth");
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }
        const managerId = context.auth.uid;
        functions.logger.info("Manager ID:", managerId);
        // Get the manager's data to check role and team
        const managerDoc = await db.collection("users").doc(managerId).get();
        if (!managerDoc.exists) {
            functions.logger.error("Manager user not found:", managerId);
            throw new functions.https.HttpsError("not-found", "Manager user not found");
        }
        const managerData = managerDoc.data();
        functions.logger.info("Manager data:", {
            role: managerData === null || managerData === void 0 ? void 0 : managerData.role,
            teamId: managerData === null || managerData === void 0 ? void 0 : managerData.teamId,
            email: managerData === null || managerData === void 0 ? void 0 : managerData.email
        });
        if ((managerData === null || managerData === void 0 ? void 0 : managerData.role) !== "manager" && (managerData === null || managerData === void 0 ? void 0 : managerData.role) !== "admin") {
            functions.logger.error("Permission denied - manager is not a manager or admin:", managerData === null || managerData === void 0 ? void 0 : managerData.role);
            throw new functions.https.HttpsError("permission-denied", "Only managers and admins can update user roles");
        }
        const { email, targetRole, teamId } = data;
        // Validate input
        if (!email || !targetRole || !teamId) {
            throw new functions.https.HttpsError("invalid-argument", "Email, targetRole, and teamId are required");
        }
        if (!["setter", "closer", "manager", "admin"].includes(targetRole)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
        }
        // Validate that the teamId is provided and exists
        if (!teamId) {
            throw new functions.https.HttpsError("invalid-argument", "Team ID is required");
        }
        // Verify the team exists and is active
        const teamDoc = await db.collection("teams").doc(teamId).get();
        if (!teamDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Specified team not found");
        }
        const teamData = teamDoc.data();
        if (!(teamData === null || teamData === void 0 ? void 0 : teamData.isActive)) {
            throw new functions.https.HttpsError("invalid-argument", "Cannot assign users to inactive teams");
        }
        functions.logger.info(`Updating user role: ${email} → ${targetRole}`);
        // Check if user exists in Firebase Auth
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        }
        catch (error) {
            if (error.code === "auth/user-not-found") {
                throw new functions.https.HttpsError("not-found", "User not found");
            }
            functions.logger.error("Error fetching user record:", error);
            throw new functions.https.HttpsError("internal", "Failed to fetch user record");
        }
        // Check if user is already in the target role
        const userDoc = await db.collection("users").doc(userRecord.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if ((userData === null || userData === void 0 ? void 0 : userData.role) === targetRole) {
                return {
                    success: true,
                    message: `User ${email} is already assigned the role ${targetRole}`,
                    noChangeNeeded: true,
                };
            }
        }
        // Update user role in users collection
        await db.collection("users").doc(userRecord.uid).update({
            role: targetRole,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Get the updated user document data
        const updatedUserDoc = await db.collection("users").doc(userRecord.uid).get();
        const currentUserData = updatedUserDoc.data();
        const oldRole = userDoc.exists ? (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role : null;
        functions.logger.info(`Updated user role in users collection: ${oldRole} → ${targetRole}`);
        // Handle closer record
        const oldRoleIsCloser = oldRole === "closer" || oldRole === "manager" || oldRole === "admin";
        const newRoleIsCloser = targetRole === "closer" || targetRole === "manager" || targetRole === "admin";
        if (newRoleIsCloser && !oldRoleIsCloser) {
            // User is becoming a closer, manager, or admin (all need closer records)
            const closerData = {
                uid: userRecord.uid,
                name: (currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.displayName) || (currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.email) || "Unknown User",
                status: "Off Duty",
                teamId: currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.teamId,
                role: targetRole,
                avatarUrl: (currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.avatarUrl) || null,
                phone: (currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.phoneNumber) || null,
                lineupOrder: 999, // Will be normalized later
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await db.collection("closers").doc(userRecord.uid).set(closerData);
            functions.logger.info(`Created closer record for new ${targetRole}: ${currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.displayName}`);
        }
        else if (!newRoleIsCloser && oldRoleIsCloser) {
            // User is no longer a closer, manager, or admin - remove closer record
            await db.collection("closers").doc(userRecord.uid).delete();
            functions.logger.info(`Removed closer record for former ${oldRole}: ${currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.displayName}`);
        }
        else if (newRoleIsCloser && oldRoleIsCloser) {
            // User is still a closer/manager/admin, update their closer record
            await db.collection("closers").doc(userRecord.uid).update({
                role: targetRole,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            functions.logger.info(`Updated closer record role for ${currentUserData === null || currentUserData === void 0 ? void 0 : currentUserData.displayName}: ${oldRole} → ${targetRole}`);
        }
        return {
            success: true,
            message: `User role updated to ${targetRole}`,
            oldRole: oldRole,
            newRole: targetRole
        };
    }
    catch (error) {
        functions.logger.error(`Error updating user role for ${data.email || 'unknown user'}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
/**
 * Chat message cleanup function
 * Runs daily to delete messages older than 7 days
 * Updated for deployment
 */
exports.cleanupOldChatMessages = functions.pubsub
    .schedule("0 2 * * *") // Run daily at 2 AM
    .timeZone("America/Los_Angeles")
    .onRun(async (context) => {
    try {
        functions.logger.info("Starting chat message cleanup...");
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        // Query old messages
        const oldMessagesQuery = db.collection("chatMessages")
            .where("timestamp", "<", admin.firestore.Timestamp.fromDate(sevenDaysAgo));
        const snapshot = await oldMessagesQuery.get();
        if (snapshot.empty) {
            functions.logger.info("No old messages to delete");
            return null;
        }
        // Delete in batches of 500 (Firestore limit)
        const batch = db.batch();
        let deleteCount = 0;
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deleteCount++;
        });
        await batch.commit();
        functions.logger.info(`Successfully deleted ${deleteCount} old chat messages`);
        return { success: true, deletedCount: deleteCount };
    }
    catch (error) {
        functions.logger.error("Error cleaning up chat messages:", error);
        throw error;
    }
});
/**
 * Initialize chat channels when teams are created
 */
exports.initializeChatChannelsOnTeamCreate = functions.firestore
    .document("teams/{teamId}")
    .onCreate(async (snap, context) => {
    try {
        const teamData = snap.data();
        const teamId = context.params.teamId;
        if (!teamData.isActive) {
            functions.logger.info(`Team ${teamId} is not active, skipping chat channel creation`);
            return null;
        }
        // Create chat channel for this team
        const channelRef = db.collection("chatChannels").doc(teamId);
        await channelRef.set({
            id: teamId,
            name: teamData.name,
            type: "team",
            teamId: teamId,
            memberCount: 0,
            isActive: true,
            lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Created chat channel for team: ${teamData.name} (${teamId})`);
        return null;
    }
    catch (error) {
        functions.logger.error("Error creating chat channel for team:", error);
        throw error;
    }
});
/**
 * Update chat channel when team is updated
 */
exports.updateChatChannelOnTeamUpdate = functions.firestore
    .document("teams/{teamId}")
    .onUpdate(async (change, context) => {
    try {
        const newData = change.after.data();
        const oldData = change.before.data();
        const teamId = context.params.teamId;
        // Check if name or active status changed
        if (newData.name !== oldData.name || newData.isActive !== oldData.isActive) {
            const channelRef = db.collection("chatChannels").doc(teamId);
            await channelRef.update({
                name: newData.name,
                isActive: newData.isActive,
            });
            functions.logger.info(`Updated chat channel for team: ${newData.name} (${teamId})`);
        }
        return null;
    }
    catch (error) {
        functions.logger.error("Error updating chat channel:", error);
        throw error;
    }
});
/**
 * Cloud Function triggered when a lead is updated to waiting_assignment
 * Handles leads that become available for assignment after being updated
 */
exports.assignLeadOnUpdate = functions.firestore
    .document("leads/{leadId}")
    .onUpdate(async (change, context) => {
    const leadId = context.params.leadId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Only trigger if status changed TO waiting_assignment and no closer assigned
    if (beforeData.status !== "waiting_assignment" &&
        afterData.status === "waiting_assignment" &&
        !afterData.assignedCloserId) {
        functions.logger.info(`🔄 Lead ${leadId} (${afterData.customerName}) updated to waiting_assignment, attempting auto-assignment`);
        try {
            const availableCloser = await getNextAvailableCloser(afterData.teamId);
            if (!availableCloser) {
                functions.logger.warn(`⚠️ No available closers for updated lead ${leadId} in team ${afterData.teamId}`);
                return null;
            }
            await assignLeadToCloser(leadId, afterData, availableCloser);
            functions.logger.info(`🎉 Successfully assigned updated lead ${leadId} to closer ${availableCloser.name}`);
            return null;
        }
        catch (error) {
            functions.logger.error(`❌ Error in assignLeadOnUpdate for lead ${leadId}:`, error);
            return null;
        }
    }
    return null;
});
/**
 * Cloud Function triggered when a closer's status changes
 * Reassigns leads if a closer goes off duty and auto-adds them to lineup if they come on duty
 */
exports.handleCloserStatusChange = functions.firestore
    .document("closers/{closerId}")
    .onUpdate(async (change, context) => {
    const closerId = context.params.closerId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if status changed from Off Duty to On Duty - auto-add to lineup at bottom
    if (beforeData.status === "Off Duty" && afterData.status === "On Duty") {
        functions.logger.info(`🟢 Closer ${closerId} (${afterData.name}) came on duty, adding to lineup at bottom`);
        try {
            const teamId = afterData.teamId;
            // Get all closers in the team to find the maximum lineup order
            const teamClosersSnapshot = await db
                .collection("closers")
                .where("teamId", "==", teamId)
                .orderBy("lineupOrder", "desc")
                .limit(1)
                .get();
            let newLineupOrder = 100000; // Default if no other closers exist
            if (!teamClosersSnapshot.empty) {
                const maxCloser = teamClosersSnapshot.docs[0].data();
                const maxLineupOrder = maxCloser.lineupOrder || 0;
                newLineupOrder = maxLineupOrder + 1000; // Place at bottom with buffer
            }
            // Update the closer's lineup order to add them to the bottom of the rotation
            await db.collection("closers").doc(closerId).update({
                lineupOrder: newLineupOrder,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            functions.logger.info(`✅ Added closer ${closerId} to lineup at bottom (order: ${newLineupOrder})`);
            // Optional: Create an activity log
            await db.collection("activities").add({
                type: "closer_added_to_lineup",
                closerId: closerId,
                closerName: afterData.name,
                newLineupOrder: newLineupOrder,
                teamId: teamId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (error) {
            functions.logger.error(`❌ Error adding closer ${closerId} to lineup:`, error);
        }
    }
    // Check if status changed from On Duty to Off Duty
    if (beforeData.status === "On Duty" && afterData.status === "Off Duty") {
        functions.logger.info(`🔴 Closer ${closerId} (${afterData.name}) went off duty, checking for reassignment`);
        try {
            // Find all in-process and scheduled leads assigned to this closer
            const assignedLeadsSnapshot = await db
                .collection("leads")
                .where("assignedCloserId", "==", closerId)
                .where("status", "in", ["waiting_assignment", "in_process", "scheduled"])
                .get();
            if (assignedLeadsSnapshot.empty) {
                functions.logger.info(`ℹ️ No active leads found for off-duty closer ${closerId}`);
                return null;
            }
            // Reassign each lead to another available closer
            const reassignmentPromises = assignedLeadsSnapshot.docs.map(async (leadDoc) => {
                const leadData = leadDoc.data();
                const newCloser = await getNextAvailableCloser(leadData.teamId);
                if (newCloser && newCloser.uid !== closerId) {
                    await assignLeadToCloser(leadDoc.id, leadData, newCloser);
                    functions.logger.info(`🔄 Reassigned lead ${leadDoc.id} from ${closerId} to ${newCloser.uid}`);
                }
                else {
                    // No available closer, put lead back to waiting assignment
                    await leadDoc.ref.update({
                        assignedCloserId: null,
                        assignedCloserName: null,
                        status: "waiting_assignment",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    functions.logger.warn(`⚠️ No available closer for reassignment, lead ${leadDoc.id} set to waiting_assignment`);
                }
            });
            await Promise.all(reassignmentPromises);
            functions.logger.info(`✅ Completed reassignment process for closer ${closerId}`);
        }
        catch (error) {
            functions.logger.error(`❌ Error in handleCloserStatusChange for closer ${closerId}:`, error);
        }
    }
    return null;
});
/**
 * Manually trigger lead assignment (callable function)
 * Useful for reassigning specific leads or batch operations
 */
exports.manualAssignLead = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { leadId } = data;
    if (!leadId) {
        throw new functions.https.HttpsError("invalid-argument", "Lead ID is required");
    }
    try {
        const leadDoc = await db.collection("leads").doc(leadId).get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        const leadData = leadDoc.data();
        // Verify user has permission (same team or manager/admin role)
        const userDoc = await db.collection("users").doc(context.auth.uid).get();
        const userData = userDoc.data();
        if (!userData || (userData.teamId !== leadData.teamId && userData.role !== "manager" && userData.role !== "admin")) {
            throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
        }
        // Check if lead requires verification before assignment
        if (leadData.status === "scheduled" && !leadData.setterVerified) {
            throw new functions.https.HttpsError("failed-precondition", "Cannot assign scheduled lead - setter verification required");
        }
        const availableCloser = await getNextAvailableCloser(leadData.teamId);
        if (!availableCloser) {
            throw new functions.https.HttpsError("not-found", "No available closers found for this team");
        }
        await assignLeadToCloser(leadId, leadData, availableCloser);
        functions.logger.info(`✅ Manually assigned lead ${leadId} to closer ${availableCloser.name}`);
        return {
            success: true,
            message: `Lead successfully assigned to ${availableCloser.name}`,
            assignedCloser: {
                uid: availableCloser.uid,
                name: availableCloser.name,
            },
        };
    }
    catch (error) {
        functions.logger.error(`Error in manualAssignLead for lead ${leadId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
//# sourceMappingURL=index.js.map