import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface Lead {
  id?: string;
  customerName: string;
  assignedCloserName?: string;
  setterId?: string;
  setterName?: string;
  status: string;
  teamId: string;
  regionId?: string;
  scheduledAppointmentTime?: admin.firestore.Timestamp | null;
}

export class SalesBoardNotifications {
  
  /**
   * Send sale notification to team chat (only for sold status)
   */
  static async sendSaleNotification(lead: Lead, teamId: string, regionId?: string): Promise<void> {
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
    await this.sendChatMessage(
      message,
      "sales_board",
      "Daily Sales Board",
      "system",
      `team_${teamId}`,
      "team"
    );

    functions.logger.info(`Sent sales notification for lead ${lead.id} to team ${teamId}`);
  }

  /**
   * Send appointment notification to setter and closer only (not team chat)
   */
  static async sendAppointmentNotification(
    lead: Lead, 
    teamId: string, 
    setterId?: string, 
    closerId?: string
  ): Promise<void> {
    const appointmentEmoji = "📅";
    
    let appointmentType = "APPOINTMENT";
    if (lead.status === "scheduled") {
      appointmentType = "APPOINTMENT SCHEDULED";
    }
    if (lead.status === "rescheduled") {
      appointmentType = "APPOINTMENT RESCHEDULED";
    }
    
    const appointmentTime = lead.scheduledAppointmentTime 
      ? new Date(lead.scheduledAppointmentTime.toDate()).toLocaleString()
      : "Time TBD";
    
    const message = 
      `${appointmentEmoji} **${appointmentType}**\n` +
      `🎯 Setter: ${lead.setterName || lead.assignedCloserName || 'Unknown'}\n` +
      `👤 Customer: ${lead.customerName}\n` +
      `⏰ Scheduled: ${appointmentTime}\n` +
      `📈 New opportunity in the pipeline!`;

    // Send individual notifications to setter and closer (not to team chat)
    if (setterId) {
      try {
        // You could send individual push notifications here instead of chat messages
        // For now, we'll skip sending appointment notifications to team chat
        functions.logger.info(`Appointment notification would be sent to setter ${setterId}`);
      } catch (error) {
        functions.logger.error(`Error sending appointment notification to setter:`, error);
      }
    }

    if (closerId && closerId !== setterId) {
      try {
        // You could send individual push notifications here instead of chat messages
        // For now, we'll skip sending appointment notifications to team chat
        functions.logger.info(`Appointment notification would be sent to closer ${closerId}`);
      } catch (error) {
        functions.logger.error(`Error sending appointment notification to closer:`, error);
      }
    }

    functions.logger.info(`Processed appointment notification for lead ${lead.id}`);
  }

  /**
   * Send a chat message to a specific channel
   */
  static async sendChatMessage(
    content: string,
    senderId: string,
    senderName: string,
    senderRole: string,
    channelId: string,
    channelType: string
  ): Promise<void> {
    try {
      await db.collection("chatMessages").add({
        content,
        senderId,
        senderName,
        senderRole,
        chatId: channelId,
        chatType: channelType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        messageType: "text",
        isDeleted: false,
        edited: false,
        reactions: {},
        mentions: [],
        attachments: []
      });

      functions.logger.info(`Chat message sent to ${channelId}`);
    } catch (error) {
      functions.logger.error(`Error sending chat message to ${channelId}:`, error);
    }
  }
}
