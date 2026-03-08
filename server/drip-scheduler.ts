import { storage } from "./storage";
import { sendSMS, isTwilioConfigured } from "./twilio-service";
import { sendGmailEmail } from "./gmail-service";
import type { DripEnrollment, DripStep, Client } from "@shared/schema";

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

async function buildVariables(enrollment: DripEnrollment, agentId: number): Promise<Record<string, string>> {
  const variables: Record<string, string> = {};

  try {
    const client = await storage.getClient(enrollment.clientId);
    if (client) {
      variables.firstName = client.firstName;
      variables.lastName = client.lastName;
      variables.clientEmail = client.email || "";
      variables.clientPhone = client.phone || client.mobilePhone || "";
      variables.clientAddress = client.address || "";
    }
  } catch (e) {
    console.error(`[DripScheduler] Failed to fetch client ${enrollment.clientId}:`, e);
  }

  try {
    const agent = await storage.getUser(agentId);
    if (agent) {
      variables.agentName = `${agent.firstName} ${agent.lastName}`;
      variables.agentFirstName = agent.firstName;
      variables.agentLastName = agent.lastName;
      variables.agentEmail = agent.email;
    }
  } catch (e) {
    console.error(`[DripScheduler] Failed to fetch agent ${agentId}:`, e);
  }

  variables.propertyAddress = "";

  return variables;
}

async function executeStep(step: DripStep, enrollment: DripEnrollment, variables: Record<string, string>): Promise<void> {
  const content = interpolateTemplate(step.content, variables);
  const subject = step.subject ? interpolateTemplate(step.subject, variables) : "";

  if (step.method === "sms") {
    const client = await storage.getClient(enrollment.clientId);
    const phone = client?.mobilePhone || client?.phone;
    if (!phone) {
      console.log(`[DripScheduler] No phone number for client ${enrollment.clientId}, skipping SMS step`);
      return;
    }
    if (!isTwilioConfigured()) {
      console.log(`[DripScheduler] Twilio not configured, skipping SMS to ${phone}`);
      return;
    }
    const result = await sendSMS(phone, content);
    if (result.success) {
      console.log(`[DripScheduler] SMS sent to ${phone} for enrollment ${enrollment.id}`);
      await storage.createCommunication({
        clientId: enrollment.clientId,
        agentId: enrollment.agentId,
        type: "sms",
        subject: subject || "Drip Campaign SMS",
        content,
        status: "sent",
        externalId: result.externalId || null,
      });
    } else {
      console.error(`[DripScheduler] SMS failed for enrollment ${enrollment.id}: ${result.error}`);
    }
  } else if (step.method === "email") {
    const client = await storage.getClient(enrollment.clientId);
    if (!client?.email) {
      console.log(`[DripScheduler] No email for client ${enrollment.clientId}, skipping email step`);
      return;
    }
    const result = await sendGmailEmail(enrollment.agentId, client.email, subject || "Update from your agent", content);
    if (result.success) {
      console.log(`[DripScheduler] Email sent to ${client.email} for enrollment ${enrollment.id}`);
      await storage.createCommunication({
        clientId: enrollment.clientId,
        agentId: enrollment.agentId,
        type: "email",
        subject: subject || "Drip Campaign Email",
        content,
        status: "sent",
        externalId: result.messageId || null,
      });
    } else {
      console.error(`[DripScheduler] Email failed for enrollment ${enrollment.id}: ${result.error}`);
    }
  } else if (step.method === "reminder") {
    console.log(`[DripScheduler] In-app reminder for enrollment ${enrollment.id}: ${subject || content}`);
    await storage.createCommunication({
      clientId: enrollment.clientId,
      agentId: enrollment.agentId,
      type: "reminder",
      subject: subject || "Drip Campaign Reminder",
      content,
      status: "sent",
      externalId: null,
    });
  }
}

export async function processDueEnrollments(): Promise<void> {
  try {
    const dueEnrollments = await storage.getDueEnrollments();
    if (dueEnrollments.length === 0) return;

    console.log(`[DripScheduler] Processing ${dueEnrollments.length} due enrollments`);

    for (const enrollment of dueEnrollments) {
      try {
        const campaign = await storage.getDripCampaign(enrollment.campaignId);
        if (!campaign || campaign.status !== "active") {
          console.log(`[DripScheduler] Campaign ${enrollment.campaignId} not active, skipping enrollment ${enrollment.id}`);
          continue;
        }

        const steps = await storage.getDripStepsByCampaign(enrollment.campaignId);
        if (steps.length === 0) {
          console.log(`[DripScheduler] No steps for campaign ${enrollment.campaignId}, completing enrollment ${enrollment.id}`);
          await storage.updateDripEnrollmentStatus(enrollment.id, "completed");
          continue;
        }

        const sortedSteps = steps.sort((a, b) => a.stepOrder - b.stepOrder);
        const currentStep = sortedSteps[enrollment.currentStepIndex];

        if (!currentStep) {
          console.log(`[DripScheduler] Enrollment ${enrollment.id} completed all steps`);
          await storage.updateDripEnrollmentStatus(enrollment.id, "completed");
          continue;
        }

        const variables = await buildVariables(enrollment, enrollment.agentId);
        try {
          await executeStep(currentStep, enrollment, variables);
        } catch (stepError) {
          console.error(`[DripScheduler] Step execution failed for enrollment ${enrollment.id}, skipping advancement:`, stepError);
          continue;
        }

        const nextStepIndex = enrollment.currentStepIndex + 1;
        let nextActionAt: Date | null = null;

        if (nextStepIndex < sortedSteps.length) {
          const nextStep = sortedSteps[nextStepIndex];
          nextActionAt = new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000);
        }

        await storage.advanceDripEnrollmentStep(enrollment.id, nextActionAt);

        if (nextStepIndex >= sortedSteps.length) {
          await storage.updateDripEnrollmentStatus(enrollment.id, "completed");
          console.log(`[DripScheduler] Enrollment ${enrollment.id} completed after last step`);
        }
      } catch (error) {
        console.error(`[DripScheduler] Error processing enrollment ${enrollment.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[DripScheduler] Error in processDueEnrollments:", error);
  }
}

export async function processSpecialDateReminders(agentId: number): Promise<void> {
  try {
    const upcomingDates = await storage.getUpcomingSpecialDates(agentId, 7);
    if (upcomingDates.length === 0) return;

    console.log(`[DripScheduler] Found ${upcomingDates.length} upcoming special dates for agent ${agentId}`);

    for (const specialDate of upcomingDates) {
      try {
        const client = await storage.getClient(specialDate.clientId);
        if (!client) continue;

        const label = specialDate.label || specialDate.dateType;
        const content = `Reminder: ${client.firstName} ${client.lastName}'s ${label} is on ${specialDate.dateValue}`;

        await storage.createCommunication({
          clientId: specialDate.clientId,
          agentId: specialDate.agentId,
          type: "reminder",
          subject: `Upcoming ${label}`,
          content,
          status: "sent",
          externalId: null,
        });

        console.log(`[DripScheduler] Created reminder for ${client.firstName} ${client.lastName}'s ${label}`);
      } catch (error) {
        console.error(`[DripScheduler] Error processing special date ${specialDate.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[DripScheduler] Error in processSpecialDateReminders:", error);
  }
}

async function processAllSpecialDateReminders(): Promise<void> {
  try {
    const { db } = await import("./db");
    const { clientSpecialDates } = await import("@shared/schema");
    const allDates = await db.selectDistinct({ agentId: clientSpecialDates.agentId }).from(clientSpecialDates).execute();
    const agentIds = allDates.map(d => d.agentId);

    for (const agentId of agentIds) {
      await processSpecialDateReminders(agentId);
    }
  } catch (error) {
    console.error("[DripScheduler] Error in processAllSpecialDateReminders:", error);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startDripScheduler(): void {
  if (schedulerInterval) {
    console.log("[DripScheduler] Scheduler already running");
    return;
  }

  console.log("[DripScheduler] Starting drip scheduler (runs every 5 minutes)");

  const runScheduledTasks = async () => {
    await processDueEnrollments().catch((err) =>
      console.error("[DripScheduler] Enrollment processing error:", err)
    );
    await processAllSpecialDateReminders().catch((err) =>
      console.error("[DripScheduler] Special date processing error:", err)
    );
  };

  runScheduledTasks();

  schedulerInterval = setInterval(runScheduledTasks, 5 * 60 * 1000);
}

export function stopDripScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[DripScheduler] Scheduler stopped");
  }
}
