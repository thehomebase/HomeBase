import { storage } from "./storage";
import { sendSMS, sendSMSFromNumber } from "./twilio-service";
import { sendGmailEmail, getGmailStatus } from "./gmail-service";

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;

async function processReminder(reminder: any) {
  const channels = typeof reminder.channels === 'string' ? JSON.parse(reminder.channels) : (reminder.channels || ['sms', 'email', 'message']);
  const deliveredVia: string[] = [];
  const agentName = `${reminder.agent_first_name || ''} ${reminder.agent_last_name || ''}`.trim();
  const message = reminder.message || reminder.title;

  if (channels.includes('sms') && reminder.client_phone) {
    try {
      const agentPhone = await storage.getAgentPhoneNumber(reminder.agent_id);
      const result = agentPhone
        ? await sendSMSFromNumber(agentPhone.phoneNumber, reminder.client_phone, message)
        : await sendSMS(reminder.client_phone, message);
      if (result.success) deliveredVia.push('sms');
    } catch (err) {
      console.error("[ReminderScheduler] SMS error:", err);
    }
  }

  if (channels.includes('email') && reminder.client_email) {
    try {
      const gmailStatus = await getGmailStatus(reminder.agent_id);
      if (gmailStatus.connected) {
        const subject = reminder.title;
        const body = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <p>Hi ${reminder.client_first_name || 'there'},</p>
          <p>${message}</p>
          <p>— ${agentName}</p>
        </div>`;
        const result = await sendGmailEmail(reminder.agent_id, reminder.client_email, subject, body);
        if (result.success) deliveredVia.push('email');
      }
    } catch (err) {
      console.error("[ReminderScheduler] Email error:", err);
    }
  }

  if (channels.includes('message') && reminder.client_email) {
    try {
      const clientUser = await storage.getUserByEmail(reminder.client_email);
      if (clientUser) {
        await storage.createPrivateMessage({
          senderId: reminder.agent_id,
          recipientId: clientUser.id,
          content: message,
        });
        deliveredVia.push('message');
      }
    } catch (err) {
      console.error("[ReminderScheduler] Private message error:", err);
    }
  }

  if (deliveredVia.length > 0) {
    await storage.markReminderSent(reminder.id);

    if (reminder.recurring) {
      const nextDate = new Date(reminder.reminder_date);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      await storage.updateClientReminder(reminder.id, {
        reminderDate: nextDate.toISOString(),
      });
    } else {
      await storage.updateClientReminder(reminder.id, { isActive: false });
    }

    console.log(`[ReminderScheduler] Delivered reminder ${reminder.id} for client ${reminder.client_first_name} via: ${deliveredVia.join(', ')}`);
  } else {
    console.log(`[ReminderScheduler] No channels delivered for reminder ${reminder.id} (client ${reminder.client_first_name}) — will retry`);
  }
}

async function processDueReminders() {
  try {
    const dueReminders = await storage.getDueReminders();
    if (dueReminders.length === 0) return;

    console.log(`[ReminderScheduler] Found ${dueReminders.length} due reminder(s)`);
    for (const reminder of dueReminders) {
      await processReminder(reminder);
    }
  } catch (error) {
    console.error("[ReminderScheduler] Error processing reminders:", error);
  }
}

export function startReminderScheduler() {
  console.log("[ReminderScheduler] Starting reminder scheduler (runs every 5 minutes)");
  setInterval(processDueReminders, REMINDER_INTERVAL_MS);
  setTimeout(processDueReminders, 10000);
}
