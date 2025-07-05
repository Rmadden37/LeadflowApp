"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAnalyticsReport = exports.getDetailedAnalytics = exports.updateUserRole = exports.inviteUser = exports.selfAssignLead = exports.processAppointmentReminders = exports.scheduleAppointmentReminder = exports.handleLeadDispositionUpdate = exports.getTeamStats = exports.acceptJob = exports.manualAssignLead = exports.handleCloserStatusChange = exports.assignLeadOnCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
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
        const response = await admin.messaging().sendMulticast(message);
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
// Simplified Sales Board Notifications (only sales to team chat, appointments to individuals)
const SalesBoardNotifications = {
    /**
     * Send sale notification to team chat (only for sold status)
     */
    sendSaleNotification: async (lead, teamId) => {
        const saleEmoji = "💥";
        const statusText = "SALE CLOSED";
        // Simple sale messages for team chat
        const saleMessages = [
            `${saleEmoji} **${statusText}** by ${lead.assignedCloserName || 'Unknown'}!\n` +
                `🎯 Customer: ${lead.customerName}\n` +
                `⏰ Time: ${new Date().toLocaleTimeString()}\n` +
                `🔥 BOOM! Great work!`,
            `${saleEmoji} **ALERT:** ${statusText} just happened!\n` +
                `🏆 Closer: ${lead.assignedCloserName || 'Unknown'}\n` +
                `👤 Customer: ${lead.customerName}\n` +
                `🎉 KA-CHING! That's how we do it!`,
            `${saleEmoji} **UPDATE:** ${lead.assignedCloserName || 'Unknown'} just CRUSHED IT!\n` +
                `📊 Customer: ${lead.customerName}\n` +
                `🕒 ${new Date().toLocaleTimeString()}\n` +
                `💰 MONEY IN THE BANK! Let's keep this momentum!`
        ];
        const message = saleMessages[Math.floor(Math.random() * saleMessages.length)];
        // Send to team chat only
        try {
            await db.collection("chatMessages").add({
                content: message,
                senderId: "sales_board",
                senderName: "Daily Sales Board",
                senderRole: "system",
                chatId: `team_${teamId}`,
                chatType: "team",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                messageType: "text",
                isDeleted: false,
                edited: false,
                reactions: {},
                mentions: [],
                attachments: []
            });
            functions.logger.info(`Sent sales notification for lead ${lead.id} to team ${teamId}`);
        }
        catch (error) {
            functions.logger.error(`Error sending sales notification:`, error);
        }
    },
    /**
     * Send appointment notification to setter and closer only (not team chat)
     */
    sendAppointmentNotification: async (lead, teamId, setterId, closerId) => {
        const appointmentTime = lead.scheduledAppointmentTime
            ? new Date(lead.scheduledAppointmentTime.toDate()).toLocaleString()
            : "Time TBD";
        // Log appointment notifications for setter and closer (not sending to team chat)
        if (setterId) {
            functions.logger.info(`Appointment notification would be sent to setter ${setterId} for lead ${lead.id}`);
        }
        if (closerId && closerId !== setterId) {
            functions.logger.info(`Appointment notification would be sent to closer ${closerId} for lead ${lead.id}`);
        }
        functions.logger.info(`Processed appointment notification for lead ${lead.id} - Time: ${appointmentTime}`);
    }
};
/**
 * Smart lead assignment algorithm
 * Priority order:
 * 1. On Duty closers only
 * 2. Same team as the lead
 * 3. Lowest lineup order (rotation system)
 * 4. Least number of current assignments
 */
async function getNextAvailableCloser(teamId) {
    try {
        // Get all on-duty closers for the team
        const closersSnapshot = await db
            .collection("closers")
            .where("teamId", "==", teamId)
            .where("status", "==", "On Duty")
            .orderBy("lineupOrder", "asc")
            .get();
        if (closersSnapshot.empty) {
            functions.logger.warn(`No on-duty closers found for team ${teamId}`);
            return null;
        }
        const availableClosers = [];
        closersSnapshot.forEach((doc) => {
            availableClosers.push(Object.assign({ uid: doc.id }, doc.data()));
        });
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
        }
        // Sort by lineup order first, then by current assignments
        availableClosers.sort((a, b) => {
            const orderA = a.lineupOrder || 999;
            const orderB = b.lineupOrder || 999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            // If same lineup order, choose the one with fewer assignments
            const assignmentsA = closerAssignments.get(a.uid) || 0;
            const assignmentsB = closerAssignments.get(b.uid) || 0;
            return assignmentsA - assignmentsB;
        });
        functions.logger.info(`Selected closer ${availableClosers[0].name} for team ${teamId}`);
        return availableClosers[0];
    }
    catch (error) {
        functions.logger.error("Error getting next available closer:", error);
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
        functions.logger.info(`Lead ${leadId} assigned to closer ${closer.name} (${closer.uid}) with status ${targetStatus}`);
        // Send lead assignment notification
        try {
            await LeadNotifications.leadAssigned(Object.assign(Object.assign({}, lead), { id: leadId, assignedCloserId: closer.uid, assignedCloserName: closer.name }), closer.uid);
        }
        catch (notificationError) {
            functions.logger.error(`Error sending lead assignment notification:`, notificationError);
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
        functions.logger.error(`Error assigning lead ${leadId} to closer ${closer.uid}:`, error);
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
    functions.logger.info(`New lead created: ${leadId} for team ${leadData.teamId}`);
    // Only auto-assign leads that don't already have a closer assigned
    if (leadData.assignedCloserId) {
        functions.logger.info(`Lead ${leadId} already has a closer assigned`);
        return null;
    }
    // Only auto-assign leads in waiting_assignment status
    if (leadData.status !== "waiting_assignment") {
        functions.logger.info(`Lead ${leadId} status is ${leadData.status}, not auto-assigning`);
        return null;
    }
    try {
        const availableCloser = await getNextAvailableCloser(leadData.teamId);
        if (!availableCloser) {
            functions.logger.warn(`No available closers for lead ${leadId} in team ${leadData.teamId}`);
            // Optional: Send notification to managers about unassigned lead
            await db.collection("notifications").add({
                type: "no_available_closers",
                leadId: leadId,
                teamId: leadData.teamId,
                customerName: leadData.customerName,
                message: `Lead ${leadData.customerName} could not be assigned - no closers available`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
            return null;
        }
        await assignLeadToCloser(leadId, leadData, availableCloser);
        functions.logger.info(`Successfully assigned lead ${leadId} to closer ${availableCloser.name}`);
        return null;
    }
    catch (error) {
        functions.logger.error(`Error in assignLeadOnCreate for lead ${leadId}:`, error);
        // Log the error for debugging but don't throw to avoid retries
        await db.collection("function_errors").add({
            function: "assignLeadOnCreate",
            leadId: leadId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
    }
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
        functions.logger.info(`Closer ${closerId} came on duty, adding to lineup at bottom`);
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
            functions.logger.info(`Added closer ${closerId} to lineup at bottom (order: ${newLineupOrder})`);
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
            functions.logger.error(`Error adding closer ${closerId} to lineup:`, error);
        }
    }
    // Check if status changed from On Duty to Off Duty
    if (beforeData.status === "On Duty" && afterData.status === "Off Duty") {
        functions.logger.info(`Closer ${closerId} went off duty, checking for reassignment`);
        try {
            // Find all in-process and scheduled leads assigned to this closer
            const assignedLeadsSnapshot = await db
                .collection("leads")
                .where("assignedCloserId", "==", closerId)
                .where("status", "in", ["in_process", "scheduled"])
                .get();
            if (assignedLeadsSnapshot.empty) {
                functions.logger.info(`No active leads found for off-duty closer ${closerId}`);
                return null;
            }
            // Reassign each lead to another available closer
            const reassignmentPromises = assignedLeadsSnapshot.docs.map(async (leadDoc) => {
                const leadData = leadDoc.data();
                const newCloser = await getNextAvailableCloser(leadData.teamId);
                if (newCloser && newCloser.uid !== closerId) {
                    await assignLeadToCloser(leadDoc.id, leadData, newCloser);
                    functions.logger.info(`Reassigned lead ${leadDoc.id} from ${closerId} to ${newCloser.uid}`);
                }
                else {
                    // No available closer, put lead back to waiting assignment
                    await leadDoc.ref.update({
                        assignedCloserId: null,
                        assignedCloserName: null,
                        status: "waiting_assignment",
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    functions.logger.warn(`No available closer for reassignment, lead ${leadDoc.id} set to waiting_assignment`);
                }
            });
            await Promise.all(reassignmentPromises);
            functions.logger.info(`Completed reassignment process for closer ${closerId}`);
        }
        catch (error) {
            functions.logger.error(`Error in handleCloserStatusChange for closer ${closerId}:`, error);
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
            throw new functions.https.HttpsError("unavailable", "No available closers for assignment");
        }
        await assignLeadToCloser(leadId, leadData, availableCloser);
        return {
            success: true,
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
/**
 * Accept a job (callable function)
 * Called when a closer clicks on their assigned lead for the first time
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
        // Get the lead
        const leadDoc = await db.collection("leads").doc(leadId).get();
        if (!leadDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        const leadData = leadDoc.data();
        // Verify the current user is the assigned closer
        if (leadData.assignedCloserId !== context.auth.uid) {
            throw new functions.https.HttpsError("permission-denied", "You are not assigned to this lead");
        }
        // Check if the job has already been accepted
        if (leadData.status === "accepted" || leadData.acceptedAt) {
            functions.logger.info(`Lead ${leadId} already accepted by ${context.auth.uid}`);
            return { success: true, alreadyAccepted: true };
        }
        // Only accept jobs that are in waiting_assignment or scheduled status
        // For scheduled leads, they must be verified before they can be accepted
        if (leadData.status !== "waiting_assignment" && leadData.status !== "scheduled") {
            throw new functions.https.HttpsError("failed-precondition", `Cannot accept job with status: ${leadData.status}`);
        }
        // Additional check for scheduled leads - they must be verified
        if (leadData.status === "scheduled" && !leadData.setterVerified) {
            throw new functions.https.HttpsError("failed-precondition", "Cannot accept scheduled appointment - setter verification required");
        }
        // Update the lead to accepted status
        await db.collection("leads").doc(leadId).update({
            status: "accepted",
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            acceptedBy: context.auth.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info(`Lead ${leadId} accepted by closer ${context.auth.uid}`);
        // Send notification to the setter if setterId exists
        if (leadData.setterId) {
            try {
                // Get closer info for notification
                const closerDoc = await db.collection("closers").doc(context.auth.uid).get();
                const closerName = closerDoc.exists ? ((_a = closerDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || "Closer" : "Closer";
                await LeadNotifications.jobAccepted(Object.assign(Object.assign({}, leadData), { id: leadId, status: "accepted", acceptedAt: admin.firestore.Timestamp.now(), acceptedBy: context.auth.uid }), leadData.setterId, closerName);
            }
            catch (notificationError) {
                functions.logger.error(`Error sending job acceptance notification:`, notificationError);
                // Don't fail the function if notification fails
            }
        }
        // Create activity log
        await db.collection("activities").add({
            type: "job_accepted",
            leadId: leadId,
            closerId: context.auth.uid,
            closerName: leadData.assignedCloserName,
            customerName: leadData.customerName,
            teamId: leadData.teamId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            alreadyAccepted: false,
            acceptedAt: new Date().toISOString()
        };
    }
    catch (error) {
        functions.logger.error(`Error in acceptJob for lead ${leadId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
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
    // Send sales board notifications for sales only (to setter and closer)
    if (beforeData.status !== afterData.status && afterData.teamId) {
        try {
            // Only send notifications for sales (sold status)
            if (afterData.status === "sold") {
                // Send sale notification to team chat
                await SalesBoardNotifications.sendSaleNotification(Object.assign(Object.assign({}, afterData), { id: leadId, assignedCloserName: afterData.assignedCloserName || 'Unknown', scheduledAppointmentTime: afterData.scheduledAppointmentTime || null }), afterData.teamId);
                functions.logger.info(`Sent sales board notification for ${afterData.status} lead ${leadId}`);
            }
            else if (["scheduled", "rescheduled"].includes(afterData.status) && afterData.scheduledAppointmentTime) {
                // Send appointment notification only to setter and closer
                await SalesBoardNotifications.sendAppointmentNotification(Object.assign(Object.assign({}, afterData), { id: leadId, assignedCloserName: afterData.assignedCloserName || 'Unknown', scheduledAppointmentTime: afterData.scheduledAppointmentTime || null }), afterData.teamId, afterData.setterId, // Send to setter
                afterData.assignedCloserId // Send to closer
                );
                functions.logger.info(`Sent appointment notification for ${afterData.status} lead ${leadId}`);
            }
        }
        catch (salesNotificationError) {
            functions.logger.error(`Error sending sales board notification:`, salesNotificationError);
        }
    }
    // Check if status changed for round robin logic
    const wasExceptionDisposition = (beforeData.status === "in_process" || beforeData.status === "accepted") &&
        (afterData.status === "canceled" || afterData.status === "rescheduled");
    const wasCompletedDisposition = (beforeData.status === "in_process" || beforeData.status === "accepted") &&
        (afterData.status === "sold" || afterData.status === "no_sale" || afterData.status === "credit_fail");
    if (!wasExceptionDisposition && !wasCompletedDisposition) {
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
            // Move to bottom for completed jobs (sold/no_sale/credit_fail)
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
            teamId: teamId,
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
                teamId: teamId,
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
                lineupOrder: 999,
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
 * Get detailed analytics data (callable function)
 * Returns comprehensive analytics including trends, performance metrics, and historical data
 */
exports.getDetailedAnalytics = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { teamId, dateRange = "30d", filterCloser } = data;
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
        // Calculate date range
        const days = parseInt(dateRange.replace('d', ''));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Build query for leads within date range
        let leadsQuery = db.collection("leads")
            .where("teamId", "==", teamId)
            .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate))
            .orderBy("createdAt", "desc");
        // Get leads and closers data
        const [leadsSnapshot, closersSnapshot] = await Promise.all([
            leadsQuery.get(),
            db.collection("closers").where("teamId", "==", teamId).get(),
        ]);
        const leads = leadsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const closers = closersSnapshot.docs.map(doc => (Object.assign({ uid: doc.id }, doc.data())));
        // Filter by closer if specified
        const filteredLeads = filterCloser && filterCloser !== "all"
            ? leads.filter(lead => lead.assignedCloserId === filterCloser)
            : leads;
        // Calculate setter analytics
        const setterAnalytics = calculateSetterMetrics(filteredLeads);
        // Calculate closer analytics
        const closerAnalytics = calculateCloserMetrics(filteredLeads);
        // Calculate dispatch analytics
        const dispatchAnalytics = calculateDispatchMetrics(filteredLeads);
        // Calculate trend data
        const trendData = generateTrendAnalysis(filteredLeads, days);
        // Calculate performance insights
        const performanceInsights = calculatePerformanceInsights(filteredLeads, closers);
        return {
            totalLeads: filteredLeads.length,
            dateRange,
            filterCloser,
            setterAnalytics,
            closerAnalytics,
            dispatchAnalytics,
            trendData,
            performanceInsights,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
    }
    catch (error) {
        functions.logger.error(`Error in getDetailedAnalytics for team ${teamId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
// Helper function to calculate setter metrics
function calculateSetterMetrics(leads) {
    const setterMap = new Map();
    leads.forEach(lead => {
        if (lead.setterId && lead.setterName) {
            const existing = setterMap.get(lead.setterId) || {
                uid: lead.setterId,
                name: lead.setterName,
                totalLeads: 0,
                soldLeads: 0,
                immediateLeads: 0,
                scheduledLeads: 0,
                avgLeadValue: 0,
                totalValue: 0,
            };
            existing.totalLeads++;
            if (lead.status === "sold") {
                existing.soldLeads++;
                // Note: saleAmount may not be available in current Lead interface
                existing.totalValue += lead.saleAmount || 0;
            }
            if (lead.dispatchType === "immediate")
                existing.immediateLeads++;
            if (lead.dispatchType === "scheduled")
                existing.scheduledLeads++;
            setterMap.set(lead.setterId, existing);
        }
    });
    return Array.from(setterMap.values()).map(setter => (Object.assign(Object.assign({}, setter), { conversionRate: setter.totalLeads > 0 ? (setter.soldLeads / setter.totalLeads) * 100 : 0, avgLeadValue: setter.soldLeads > 0 ? setter.totalValue / setter.soldLeads : 0 })));
}
// Helper function to calculate closer metrics
function calculateCloserMetrics(leads) {
    const closerMap = new Map();
    leads.forEach(lead => {
        if (lead.assignedCloserId && lead.assignedCloserName) {
            const existing = closerMap.get(lead.assignedCloserId) || {
                uid: lead.assignedCloserId,
                name: lead.assignedCloserName,
                totalAssigned: 0,
                totalSold: 0,
                totalNoSale: 0,
                totalFailedCredits: 0,
                totalValue: 0,
                avgTimeToClose: 0,
                totalCloseTime: 0,
            };
            // Only count leads that have reached final disposition
            if (['sold', 'no_sale', 'credit_fail', 'canceled'].includes(lead.status)) {
                existing.totalAssigned++;
                if (lead.status === "sold") {
                    existing.totalSold++;
                    existing.totalValue += lead.saleAmount || 0;
                    // Calculate time to close if timestamps available
                    if (lead.acceptedAt && lead.soldAt) {
                        const timeToClose = new Date(lead.soldAt).getTime() - new Date(lead.acceptedAt).getTime();
                        existing.totalCloseTime += timeToClose;
                    }
                }
                if (lead.status === "no_sale")
                    existing.totalNoSale++;
                if (lead.status === "credit_fail")
                    existing.totalFailedCredits++;
            }
            closerMap.set(lead.assignedCloserId, existing);
        }
    });
    return Array.from(closerMap.values()).map(closer => (Object.assign(Object.assign({}, closer), { closingRatio: closer.totalAssigned > 0 ? (closer.totalSold / closer.totalAssigned) * 100 : 0, avgSaleValue: closer.totalSold > 0 ? closer.totalValue / closer.totalSold : 0, avgTimeToClose: closer.totalSold > 0 ? closer.totalCloseTime / closer.totalSold / (1000 * 60 * 60) : 0 })));
}
// Helper function to calculate dispatch metrics
function calculateDispatchMetrics(leads) {
    const immediate = { total: 0, sold: 0, totalValue: 0, avgTimeToAssign: 0 };
    const scheduled = { total: 0, sold: 0, totalValue: 0, avgTimeToAssign: 0 };
    leads.forEach(lead => {
        if (lead.dispatchType === "immediate") {
            immediate.total++;
            if (lead.status === "sold") {
                immediate.sold++;
                immediate.totalValue += lead.saleAmount || 0;
            }
        }
        else if (lead.dispatchType === "scheduled") {
            scheduled.total++;
            if (lead.status === "sold") {
                scheduled.sold++;
                scheduled.totalValue += lead.saleAmount || 0;
            }
        }
    });
    return {
        immediate: Object.assign(Object.assign({}, immediate), { conversionRate: immediate.total > 0 ? (immediate.sold / immediate.total) * 100 : 0, avgSaleValue: immediate.sold > 0 ? immediate.totalValue / immediate.sold : 0 }),
        scheduled: Object.assign(Object.assign({}, scheduled), { conversionRate: scheduled.total > 0 ? (scheduled.sold / scheduled.total) * 100 : 0, avgSaleValue: scheduled.sold > 0 ? scheduled.totalValue / scheduled.sold : 0 }),
    };
}
// Helper function to generate trend analysis
function generateTrendAnalysis(leads, days) {
    const trendData = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLeads = leads.filter(lead => {
            const leadDate = new Date(lead.createdAt.seconds * 1000);
            return leadDate.toDateString() === date.toDateString();
        });
        const totalLeads = dayLeads.length;
        const soldLeads = dayLeads.filter(lead => lead.status === 'sold').length;
        const immediateLeads = dayLeads.filter(lead => lead.dispatchType === 'immediate');
        const scheduledLeads = dayLeads.filter(lead => lead.dispatchType === 'scheduled');
        trendData.push({
            date: dateStr,
            totalLeads,
            soldLeads,
            conversionRate: totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0,
            immediateLeads: immediateLeads.length,
            scheduledLeads: scheduledLeads.length,
            totalValue: dayLeads.reduce((sum, lead) => sum + (lead.saleAmount || 0), 0),
        });
    }
    return trendData;
}
// Helper function to calculate performance insights
function calculatePerformanceInsights(leads, closers) {
    const totalLeads = leads.length;
    const soldLeads = leads.filter(lead => lead.status === 'sold').length;
    const onDutyClosers = closers.filter(closer => closer.status === 'On Duty').length;
    // Calculate weekly comparison
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const thisWeekLeads = leads.filter(lead => {
        const leadDate = new Date(lead.createdAt.seconds * 1000);
        return leadDate >= oneWeekAgo;
    });
    const lastWeekLeads = leads.filter(lead => {
        const leadDate = new Date(lead.createdAt.seconds * 1000);
        return leadDate >= twoWeeksAgo && leadDate < oneWeekAgo;
    });
    const weeklyGrowth = lastWeekLeads.length > 0
        ? ((thisWeekLeads.length - lastWeekLeads.length) / lastWeekLeads.length) * 100
        : 0;
    // Find top performer
    const closerPerformance = new Map();
    leads.forEach(lead => {
        if (lead.assignedCloserId && ['sold', 'no_sale', 'credit_fail'].includes(lead.status)) {
            const existing = closerPerformance.get(lead.assignedCloserId) || { sold: 0, total: 0 };
            existing.total++;
            if (lead.status === 'sold')
                existing.sold++;
            closerPerformance.set(lead.assignedCloserId, existing);
        }
    });
    let topPerformer = null;
    let bestRatio = 0;
    closerPerformance.forEach((stats, closerId) => {
        if (stats.total >= 5) { // Minimum threshold
            const ratio = (stats.sold / stats.total) * 100;
            if (ratio > bestRatio) {
                bestRatio = ratio;
                const closer = closers.find(c => c.uid === closerId);
                topPerformer = closer ? closer.name : 'Unknown';
            }
        }
    });
    return {
        totalConversionRate: totalLeads > 0 ? (soldLeads / totalLeads) * 100 : 0,
        weeklyGrowth,
        topPerformer,
        topPerformerRatio: bestRatio,
        onDutyClosers,
        avgLeadsPerCloser: onDutyClosers > 0 ? totalLeads / onDutyClosers : 0,
        totalRevenue: leads.reduce((sum, lead) => sum + (lead.saleAmount || 0), 0),
    };
}
/**
 * Generate analytics report (callable function)
 * Creates and returns a comprehensive analytics report for export
 */
exports.generateAnalyticsReport = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { teamId, dateRange = "30d", format = "json" } = data;
    if (!teamId) {
        throw new functions.https.HttpsError("invalid-argument", "Team ID is required");
    }
    try {
        // Get detailed analytics data
        const analyticsData = await exports.getDetailedAnalytics.run({ teamId, dateRange }, context);
        // Format the report based on requested format
        const report = {
            generatedAt: new Date().toISOString(),
            teamId,
            dateRange,
            summary: analyticsData.performanceInsights,
            setterPerformance: analyticsData.setterAnalytics,
            closerPerformance: analyticsData.closerAnalytics,
            dispatchAnalysis: analyticsData.dispatchAnalytics,
            trends: analyticsData.trendData,
        };
        return {
            report,
            format,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };
    }
    catch (error) {
        functions.logger.error(`Error in generateAnalyticsReport for team ${teamId}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Internal server error");
    }
});
//# sourceMappingURL=index.js.map