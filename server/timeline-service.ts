import { storage } from "./storage";
import type { Transaction, Document } from "@shared/schema";

export interface TimelineEvent {
  id: string;
  event: string;
  date: Date | null;
  status: "completed" | "on_track" | "approaching" | "warning" | "overdue" | "not_set";
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  message: string;
  daysRemaining: number | null;
  category: "milestone" | "document" | "deadline";
}

export interface TransactionTimeline {
  events: TimelineEvent[];
  overallRisk: "low" | "medium" | "high" | "critical";
  summary: string;
}

function daysBetween(date1: Date, date2: Date): number {
  const diff = date2.getTime() - date1.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDateStatus(date: Date | null, now: Date): { status: TimelineEvent["status"]; riskLevel: TimelineEvent["riskLevel"]; daysRemaining: number | null } {
  if (!date) {
    return { status: "not_set", riskLevel: "none", daysRemaining: null };
  }

  const days = daysBetween(now, date);

  if (days < 0) {
    return { status: "overdue", riskLevel: "critical", daysRemaining: days };
  } else if (days === 0) {
    return { status: "warning", riskLevel: "high", daysRemaining: 0 };
  } else if (days <= 2) {
    return { status: "warning", riskLevel: "high", daysRemaining: days };
  } else if (days <= 5) {
    return { status: "approaching", riskLevel: "medium", daysRemaining: days };
  } else if (days <= 14) {
    return { status: "on_track", riskLevel: "low", daysRemaining: days };
  } else {
    return { status: "on_track", riskLevel: "none", daysRemaining: days };
  }
}

export async function generateTransactionTimeline(transactionId: number): Promise<TransactionTimeline> {
  const transaction = await storage.getTransaction(transactionId);
  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const documents = await storage.getDocumentsByTransaction(transactionId);
  const now = new Date();
  const events: TimelineEvent[] = [];

  if (transaction.contractExecutionDate) {
    const isPast = transaction.contractExecutionDate <= now;
    events.push({
      id: "contract_execution",
      event: "Contract Execution",
      date: transaction.contractExecutionDate,
      status: isPast ? "completed" : "on_track",
      riskLevel: "none",
      message: isPast ? "Contract executed" : `Contract execution scheduled`,
      daysRemaining: isPast ? null : daysBetween(now, transaction.contractExecutionDate),
      category: "milestone",
    });
  }

  if (transaction.optionPeriodExpiration) {
    const { status, riskLevel, daysRemaining } = getDateStatus(transaction.optionPeriodExpiration, now);
    let message = "";
    if (status === "overdue") {
      message = "Option period has expired";
    } else if (status === "warning") {
      message = `Option period expires ${daysRemaining === 0 ? "today" : `in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`}`;
    } else if (status === "approaching") {
      message = `Option period expires in ${daysRemaining} days`;
    } else {
      message = `Option period expires in ${daysRemaining} days`;
    }

    const hasAmendment = documents.some(d => d.name.toLowerCase().includes("amendment") && d.status === "complete");
    if ((status === "warning" || status === "approaching") && !hasAmendment) {
      message += " — no amendment uploaded yet";
    }

    events.push({
      id: "option_period",
      event: "Option Period Expiration",
      date: transaction.optionPeriodExpiration,
      status: transaction.optionPeriodExpiration < now ? "completed" : status,
      riskLevel,
      message,
      daysRemaining,
      category: "deadline",
    });
  }

  if (transaction.closingDate) {
    const { status, riskLevel, daysRemaining } = getDateStatus(transaction.closingDate, now);
    let message = "";
    if (status === "overdue") {
      message = "Closing date has passed";
    } else if (status === "warning") {
      message = `Closing ${daysRemaining === 0 ? "is today" : `in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`}`;
    } else if (status === "approaching") {
      message = `Closing in ${daysRemaining} days`;
    } else {
      message = `Closing in ${daysRemaining} days`;
    }

    const titleDoc = documents.find(d => d.name.toLowerCase().includes("title") && d.name.toLowerCase().includes("commitment"));
    if ((status === "warning" || status === "approaching") && titleDoc && titleDoc.status !== "complete") {
      message += " — title commitment still " + titleDoc.status.replace("_", " ");
    }

    const pendingDocs = documents.filter(d => d.status === "waiting_signatures" || d.status === "waiting_others");
    if ((status === "warning" || status === "approaching") && pendingDocs.length > 0) {
      message += ` — ${pendingDocs.length} document${pendingDocs.length !== 1 ? "s" : ""} still pending`;
    }

    events.push({
      id: "closing",
      event: "Closing Date",
      date: transaction.closingDate,
      status: transaction.status === "closed" ? "completed" : status,
      riskLevel: transaction.status === "closed" ? "none" : riskLevel,
      message: transaction.status === "closed" ? "Transaction closed" : message,
      daysRemaining: transaction.status === "closed" ? null : daysRemaining,
      category: "milestone",
    });
  }

  const criticalDocs = [
    { pattern: "iabs", label: "IABS" },
    { pattern: "buyer rep", label: "Buyer Rep Agreement" },
    { pattern: "seller", label: "Seller Disclosure" },
    { pattern: "survey", label: "Property Survey" },
    { pattern: "appraisal", label: "Appraisal" },
    { pattern: "inspection", label: "Inspection Report" },
    { pattern: "title", label: "Title Work" },
    { pattern: "hoa", label: "HOA Documents" },
  ];

  for (const critDoc of criticalDocs) {
    const doc = documents.find(d => d.name.toLowerCase().includes(critDoc.pattern));
    if (doc && doc.status !== "complete" && doc.status !== "not_applicable") {
      let docRisk: TimelineEvent["riskLevel"] = "low";
      let docStatus: TimelineEvent["status"] = "on_track";

      if (transaction.closingDate) {
        const closingDays = daysBetween(now, transaction.closingDate);
        if (closingDays <= 5 && doc.status === "waiting_signatures") {
          docRisk = "high";
          docStatus = "warning";
        } else if (closingDays <= 14 && doc.status === "waiting_signatures") {
          docRisk = "medium";
          docStatus = "approaching";
        }
      }

      let deadline: Date | null = null;
      if (doc.deadline) {
        deadline = new Date(doc.deadline);
        const deadlineStatus = getDateStatus(deadline, now);
        if (deadlineStatus.riskLevel === "high" || deadlineStatus.riskLevel === "critical") {
          docRisk = deadlineStatus.riskLevel;
          docStatus = deadlineStatus.status;
        }
      }

      events.push({
        id: `doc_${doc.id}`,
        event: `${critDoc.label}`,
        date: deadline,
        status: docStatus,
        riskLevel: docRisk,
        message: `${critDoc.label} is ${doc.status.replace(/_/g, " ")}`,
        daysRemaining: deadline ? daysBetween(now, deadline) : null,
        category: "document",
      });
    }
  }

  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  const riskLevels = events.map(e => e.riskLevel);
  let overallRisk: TransactionTimeline["overallRisk"] = "low";
  if (riskLevels.includes("critical")) overallRisk = "critical";
  else if (riskLevels.includes("high")) overallRisk = "high";
  else if (riskLevels.includes("medium")) overallRisk = "medium";

  const warnings = events.filter(e => e.riskLevel === "high" || e.riskLevel === "critical");
  let summary = "";
  if (warnings.length === 0) {
    summary = "All deadlines are on track.";
  } else if (warnings.length === 1) {
    summary = `1 item needs attention: ${warnings[0].message}`;
  } else {
    summary = `${warnings.length} items need attention.`;
  }

  return { events, overallRisk, summary };
}

export async function generateAgentAlerts(agentId: number): Promise<{ transactionId: number; streetName: string; alerts: TimelineEvent[] }[]> {
  const transactions = await storage.getTransactionsByUser(agentId);
  const activeTransactions = transactions.filter(t =>
    t.status !== "closed" && t.status !== "cancelled"
  );

  const results: { transactionId: number; streetName: string; alerts: TimelineEvent[] }[] = [];

  for (const transaction of activeTransactions) {
    try {
      const timeline = await generateTransactionTimeline(transaction.id);
      const alerts = timeline.events.filter(e =>
        e.riskLevel === "medium" || e.riskLevel === "high" || e.riskLevel === "critical"
      );
      if (alerts.length > 0) {
        results.push({
          transactionId: transaction.id,
          streetName: transaction.streetName,
          alerts,
        });
      }
    } catch (e) {
    }
  }

  return results;
}
