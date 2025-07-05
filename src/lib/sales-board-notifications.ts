import { ChatService } from "@/lib/chat-service";
import { Lead } from "@/types";
import { format } from "date-fns";

export class SalesBoardNotifications {
  
  static async sendSaleNotification(lead: Lead, teamId: string, regionId?: string): Promise<void> {
    const saleEmoji = lead.status === "sold" ? "💥" : "❌";
    const statusText = lead.status === "sold" ? "SALE CLOSED" : "CREDIT FAIL";
    
    const message = `${saleEmoji} **${statusText}** by ${lead.assignedCloserName || 'Unknown'}\n` +
                   `Customer: ${lead.customerName}\n` +
                   `Time: ${format(new Date(), 'h:mm a')}\n` +
                   `${lead.status === "sold" ? "🎉 Great work team!" : "💪 Keep pushing forward!"}`;

    // Send to team chat
    await ChatService.sendMessage(
      message,
      "system",
      "Sales Board",
      "admin",
      `team_${teamId}`,
      "team",
      undefined,
      undefined,
      "text"
    );

    // Send to region chat if available
    if (regionId) {
      await ChatService.sendMessage(
        message,
        "system",
        "Sales Board",
        "admin",
        `region_${regionId}`,
        "region",
        undefined,
        undefined,
        "text"
      );
    }
  }

  static async sendAppointmentNotification(lead: Lead, teamId: string, regionId?: string): Promise<void> {
    const appointmentTime = lead.scheduledAppointmentTime?.toDate();
    const createdTime = lead.createdAt.toDate();
    
    // Determine appointment type
    let type = "SO"; // Set Out
    if (appointmentTime && createdTime) {
      const daysDiff = Math.floor((appointmentTime.getTime() - createdTime.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 0) type = "SD"; // Same Day
      else if (daysDiff === 1) type = "ND"; // Next Day
    }

    const message = `📄 **APPOINTMENT SET** (${type}) by ${lead.setterName || 'Unknown'}\n` +
                   `Customer: ${lead.customerName}\n` +
                   `Scheduled: ${appointmentTime ? format(appointmentTime, 'MMM d, h:mm a') : 'TBD'}\n` +
                   `Set at: ${format(new Date(), 'h:mm a')}\n` +
                   `🎯 Let's close this one!`;

    // Send to team chat
    await ChatService.sendMessage(
      message,
      "system",
      "Sales Board",
      "admin",
      `team_${teamId}`,
      "team",
      undefined,
      undefined,
      "text"
    );

    // Send to region chat if available
    if (regionId) {
      await ChatService.sendMessage(
        message,
        "system",
        "Sales Board",
        "admin",
        `region_${regionId}`,
        "region",
        undefined,
        undefined,
        "text"
      );
    }
  }

  static async sendDailyReset(teamId: string, regionId?: string): Promise<void> {
    const today = format(new Date(), 'EEEE, MMMM d');
    
    const message = `🌅 **DAILY SALES BOARD RESET**\n` +
                   `${today} - 8:00 AM\n\n` +
                   `🎯 New day, new opportunities!\n` +
                   `💥 Sales: 0\n` +
                   `📄 Appointments: 0\n` +
                   `⚡ Momentum: Building...\n\n` +
                   `Let's make today count! 🚀`;

    // Send to team chat
    await ChatService.sendMessage(
      message,
      "system",
      "Sales Board",
      "admin",
      `team_${teamId}`,
      "team",
      undefined,
      undefined,
      "text"
    );

    // Send to region chat if available
    if (regionId) {
      await ChatService.sendMessage(
        message,
        "system",
        "Sales Board",
        "admin",
        `region_${regionId}`,
        "region",
        undefined,
        undefined,
        "text"
      );
    }
  }

  static async sendMilestoneNotification(
    milestone: string, 
    teamId: string, 
    regionId?: string,
    performerName?: string,
    count?: number
  ): Promise<void> {
    let message = "";
    
    switch (milestone) {
      case "first_sale":
        message = `🔥 **FIRST SALE OF THE DAY!**\n` +
                 `${performerName} opened the board! 💥\n` +
                 `Time: ${format(new Date(), 'h:mm a')}\n` +
                 `🎉 Momentum is building!`;
        break;
        
      case "five_sales":
        message = `🏆 **5 SALES MILESTONE!**\n` +
                 `The team is on fire! 🔥\n` +
                 `Sales: ${count}\n` +
                 `Time: ${format(new Date(), 'h:mm a')}\n` +
                 `🚀 Keep it rolling!`;
        break;
        
      case "ten_appointments":
        message = `📄 **10 APPOINTMENTS SET!**\n` +
                 `Pipeline is looking strong! 💪\n` +
                 `Appointments: ${count}\n` +
                 `Time: ${format(new Date(), 'h:mm a')}\n` +
                 `🎯 Close them all!`;
        break;
        
      case "hot_streak":
        message = `🔥 **HOT STREAK ALERT!**\n` +
                 `${performerName} is on a roll! 🎯\n` +
                 `Consecutive deals: ${count}\n` +
                 `Time: ${format(new Date(), 'h:mm a')}\n` +
                 `🏆 Unstoppable!`;
        break;
        
      default:
        message = `🎉 **TEAM MILESTONE!**\n` +
                 `${milestone}\n` +
                 `Time: ${format(new Date(), 'h:mm a')}\n` +
                 `🚀 Great teamwork!`;
    }

    // Send to team chat
    await ChatService.sendMessage(
      message,
      "system",
      "Sales Board",
      "admin",
      `team_${teamId}`,
      "team",
      undefined,
      undefined,
      "text"
    );

    // Send to region chat if available
    if (regionId) {
      await ChatService.sendMessage(
        message,
        "system",
        "Sales Board",
        "admin",
        `region_${regionId}`,
        "region",
        undefined,
        undefined,
        "text"
      );
    }
  }

  static async sendCelebrationReaction(
    type: "congratulations" | "motivation" | "fire",
    teamId: string,
    senderName: string,
    regionId?: string
  ): Promise<void> {
    let emoji = "";
    let message = "";
    
    switch (type) {
      case "congratulations":
        emoji = "🎉";
        message = `${emoji} ${senderName} sent congratulations to the team!`;
        break;
      case "motivation":
        emoji = "💪";
        message = `${emoji} ${senderName} is motivating the team! Let's go!`;
        break;
      case "fire":
        emoji = "🔥";
        message = `${emoji} ${senderName} says the team is on fire!`;
        break;
    }

    // Send to team chat
    await ChatService.sendMessage(
      message,
      "system",
      "Team Reaction",
      "admin",
      `team_${teamId}`,
      "team",
      undefined,
      undefined,
      "emoji"
    );

    // Send to region chat if available
    if (regionId) {
      await ChatService.sendMessage(
        message,
        "system",
        "Team Reaction",
        "admin",
        `region_${regionId}`,
        "region",
        undefined,
        undefined,
        "emoji"
      );
    }
  }
}
