import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);

  const existing = await sql`SELECT id FROM users WHERE email = 'demo@homebase.com'`;
  if (existing.length > 0) {
    console.log("Demo user already exists (id:", existing[0].id, "). Cleaning up old data...");
    const agentId = existing[0].id;
    await sql`DELETE FROM documents WHERE transaction_id IN (SELECT id FROM transactions WHERE agent_id = ${agentId})`;
    await sql`DELETE FROM inspection_items WHERE transaction_id IN (SELECT id FROM transactions WHERE agent_id = ${agentId})`;
    await sql`DELETE FROM showing_requests WHERE requester_id = ${agentId} OR recipient_id = ${agentId}`;
    await sql`DELETE FROM property_viewings WHERE agent_id = ${agentId}`;
    await sql`DELETE FROM transactions WHERE agent_id = ${agentId}`;
    await sql`DELETE FROM clients WHERE agent_id = ${agentId}`;
    await sql`DELETE FROM users WHERE id = ${agentId}`;
    console.log("Cleaned up old demo data.");
  }

  const hashedPassword = await hashPassword("Demo2026!");

  const [demoUser] = await sql`
    INSERT INTO users (email, password, first_name, last_name, role, email_verified, verification_status, license_number, license_state, brokerage_name, profile_bio, profile_phone)
    VALUES (
      'demo@homebase.com',
      ${hashedPassword},
      'James',
      'Donovan',
      'agent',
      true,
      'verified',
      'TX-0847291',
      'TX',
      'Lone Star Realty Group',
      'Top-producing agent in Austin, TX with 12+ years of experience specializing in residential real estate. TREC licensed, Austin Board of Realtors member.',
      '(512) 555-0142'
    )
    RETURNING id
  `;
  const agentId = demoUser.id;
  console.log("Created demo agent, id:", agentId);

  const clientsData = [
    { firstName: "Sarah", lastName: "Martinez", email: "sarah.martinez@email.com", phone: "(512) 555-0201", type: ["buyer"], status: "active", street: "2401 Lakeline Blvd", city: "Austin", zipCode: "78734", source: "referral", labels: ["first-time buyer"] },
    { firstName: "Tom", lastName: "Johnson", email: "tom.johnson@email.com", phone: "(512) 555-0302", type: ["seller"], status: "active", street: "1847 Oakwood Dr", city: "Austin", zipCode: "78704", source: "website", labels: ["relocation"] },
    { firstName: "Emily", lastName: "Chen", email: "emily.chen@email.com", phone: "(512) 555-0403", type: ["buyer"], status: "active", street: "910 Congress Ave", city: "Austin", zipCode: "78701", source: "open house", labels: ["investor"] },
    { firstName: "Robert", lastName: "Williams", email: "robert.williams@email.com", phone: "(512) 555-0504", type: ["buyer", "seller"], status: "active", street: "4520 Bee Cave Rd", city: "Austin", zipCode: "78746", source: "referral", labels: ["luxury"] },
    { firstName: "Jessica", lastName: "Nguyen", email: "jessica.nguyen@email.com", phone: "(512) 555-0605", type: ["buyer"], status: "active", street: "300 Bowie St", city: "Austin", zipCode: "78703", source: "zillow", labels: ["first-time buyer"] },
    { firstName: "Michael", lastName: "Brown", email: "michael.brown@email.com", phone: "(512) 555-0706", type: ["seller"], status: "active", street: "7800 Shoal Creek Blvd", city: "Austin", zipCode: "78757", source: "past client", labels: ["repeat client"] },
    { firstName: "Amanda", lastName: "Davis", email: "amanda.davis@email.com", phone: "(512) 555-0807", type: ["buyer"], status: "prospect", street: "1100 S Lamar Blvd", city: "Austin", zipCode: "78704", source: "instagram", labels: [] },
    { firstName: "Carlos", lastName: "Rivera", email: "carlos.rivera@email.com", phone: "(512) 555-0908", type: ["seller"], status: "active", street: "5200 N Lamar Blvd", city: "Austin", zipCode: "78751", source: "yard sign", labels: ["relocation"] },
  ];

  const clientIds: number[] = [];
  for (const c of clientsData) {
    const [client] = await sql`
      INSERT INTO clients (first_name, last_name, email, phone, type, status, street, city, zip_code, source, labels, agent_id, created_at, updated_at)
      VALUES (${c.firstName}, ${c.lastName}, ${c.email}, ${c.phone}, ${c.type}, ${c.status}, ${c.street}, ${c.city}, ${c.zipCode}, ${c.source}, ${c.labels}, ${agentId}, NOW(), NOW())
      RETURNING id
    `;
    clientIds.push(client.id);
  }
  console.log("Created", clientIds.length, "clients");

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const transactionsData = [
    {
      streetName: "1847 Oakwood Dr", city: "Austin", state: "TX", zipCode: "78704",
      status: "active_option", type: "sell", clientId: clientIds[1],
      contractPrice: 485000, optionFee: 500, earnestMoney: 5000, downPayment: 97000,
      closingDate: daysFromNow(28), optionPeriodExpiration: daysFromNow(5),
      contractExecutionDate: daysAgo(2), mlsNumber: "MLS-2026-4821", financing: "conventional"
    },
    {
      streetName: "402 Elm St", city: "Austin", state: "TX", zipCode: "78703",
      status: "pending", type: "buy", clientId: clientIds[0],
      contractPrice: 375000, optionFee: 300, earnestMoney: 3750, downPayment: 75000,
      closingDate: daysFromNow(14), optionPeriodExpiration: daysAgo(3),
      contractExecutionDate: daysAgo(18), mlsNumber: "MLS-2026-3199", financing: "fha"
    },
    {
      streetName: "98 Pine Lane", city: "Austin", state: "TX", zipCode: "78746",
      status: "active_option", type: "buy", clientId: clientIds[2],
      contractPrice: 625000, optionFee: 750, earnestMoney: 6250, downPayment: 125000,
      closingDate: daysFromNow(35), optionPeriodExpiration: daysFromNow(8),
      contractExecutionDate: daysAgo(1), mlsNumber: "MLS-2026-5502", financing: "conventional"
    },
    {
      streetName: "4520 Bee Cave Rd", city: "Austin", state: "TX", zipCode: "78746",
      status: "closed", type: "sell", clientId: clientIds[3],
      contractPrice: 1250000, optionFee: 2000, earnestMoney: 12500, downPayment: 250000,
      closingDate: daysAgo(5), contractExecutionDate: daysAgo(45), mlsNumber: "MLS-2026-2714", financing: "conventional"
    },
    {
      streetName: "7800 Shoal Creek Blvd", city: "Austin", state: "TX", zipCode: "78757",
      status: "pre_listing", type: "sell", clientId: clientIds[5],
      contractPrice: 340000, closingDate: null, mlsNumber: null, financing: null
    },
    {
      streetName: "2100 Barton Springs Rd", city: "Austin", state: "TX", zipCode: "78704",
      status: "prospect", type: "buy", clientId: clientIds[4],
      contractPrice: 299000, closingDate: null, mlsNumber: null, financing: "va"
    },
    {
      streetName: "5200 N Lamar Blvd", city: "Austin", state: "TX", zipCode: "78751",
      status: "active_option", type: "sell", clientId: clientIds[7],
      contractPrice: 415000, optionFee: 400, earnestMoney: 4150, downPayment: 83000,
      closingDate: daysFromNow(21), optionPeriodExpiration: daysFromNow(3),
      contractExecutionDate: daysAgo(4), mlsNumber: "MLS-2026-6103", financing: "conventional"
    },
  ];

  const txnIds: number[] = [];
  for (const t of transactionsData) {
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const [txn] = await sql`
      INSERT INTO transactions (street_name, city, state, zip_code, access_code, status, type, agent_id, client_id, participants, contract_price, option_fee, earnest_money, down_payment, closing_date, option_period_expiration, contract_execution_date, mls_number, financing)
      VALUES (
        ${t.streetName}, ${t.city}, ${t.state}, ${t.zipCode}, ${accessCode}, ${t.status}, ${t.type}, ${agentId}, ${t.clientId},
        ${JSON.stringify([{ userId: agentId, role: "agent" }])},
        ${t.contractPrice || null}, ${t.optionFee || null}, ${t.earnestMoney || null}, ${t.downPayment || null},
        ${t.closingDate || null}, ${t.optionPeriodExpiration || null}, ${t.contractExecutionDate || null},
        ${t.mlsNumber || null}, ${t.financing || null}
      )
      RETURNING id
    `;
    txnIds.push(txn.id);
  }
  console.log("Created", txnIds.length, "transactions");

  const docsForTxn0 = [
    { name: "IABS", status: "complete", txnId: txnIds[0] },
    { name: "Listing Agreement", status: "signed", txnId: txnIds[0] },
    { name: "Seller's Disclosure", status: "complete", txnId: txnIds[0] },
    { name: "MLS Data Sheet", status: "complete", txnId: txnIds[0] },
    { name: "1-4 Family Contract", status: "signed", txnId: txnIds[0] },
    { name: "Third Party Financing", status: "waiting_signatures", txnId: txnIds[0], signingPlatform: "docusign" },
    { name: "T-47 Survey", status: "waiting_others", txnId: txnIds[0] },
    { name: "Title Commitment", status: "waiting_others", txnId: txnIds[0] },
    { name: "Option Fee Receipt", status: "signed", txnId: txnIds[0] },
    { name: "Earnest Money Receipt", status: "waiting_signatures", txnId: txnIds[0], signingPlatform: "signnow" },
    { name: "HOA Docs", status: "not_applicable", txnId: txnIds[0] },
    { name: "Lead Paint Disclosure", status: "not_applicable", txnId: txnIds[0] },
  ];

  const docsForTxn1 = [
    { name: "IABS", status: "complete", txnId: txnIds[1] },
    { name: "Buyer Rep Agreement", status: "signed", txnId: txnIds[1] },
    { name: "1-4 Family Contract", status: "signed", txnId: txnIds[1] },
    { name: "Third Party Financing", status: "signed", txnId: txnIds[1] },
    { name: "Seller's Disclosure", status: "complete", txnId: txnIds[1] },
    { name: "T-47 Survey", status: "complete", txnId: txnIds[1] },
    { name: "Title Commitment", status: "complete", txnId: txnIds[1] },
    { name: "Option Fee Receipt", status: "complete", txnId: txnIds[1] },
    { name: "Earnest Money Receipt", status: "complete", txnId: txnIds[1] },
    { name: "Home Warranty", status: "waiting_signatures", txnId: txnIds[1], signingPlatform: "docusign" },
    { name: "HOA Docs", status: "waiting_others", txnId: txnIds[1] },
    { name: "Appraisal", status: "complete", txnId: txnIds[1] },
  ];

  const docsForTxn2 = [
    { name: "IABS", status: "signed", txnId: txnIds[2] },
    { name: "Buyer Rep Agreement", status: "waiting_signatures", txnId: txnIds[2], signingPlatform: "signnow" },
    { name: "1-4 Family Contract", status: "signed", txnId: txnIds[2] },
    { name: "Third Party Financing", status: "waiting_signatures", txnId: txnIds[2], signingPlatform: "docusign" },
    { name: "Seller's Disclosure", status: "waiting_others", txnId: txnIds[2] },
    { name: "T-47 Survey", status: "not_applicable", txnId: txnIds[2] },
    { name: "Option Fee Receipt", status: "waiting_signatures", txnId: txnIds[2], signingPlatform: "signnow" },
    { name: "Lead Paint Disclosure", status: "not_applicable", txnId: txnIds[2] },
  ];

  const allDocs = [...docsForTxn0, ...docsForTxn1, ...docsForTxn2];
  for (const d of allDocs) {
    await sql`
      INSERT INTO documents (name, status, transaction_id, signing_platform)
      VALUES (${d.name}, ${d.status}, ${d.txnId}, ${(d as any).signingPlatform || null})
    `;
  }
  console.log("Created", allDocs.length, "documents across 3 transactions");

  const viewingsData = [
    { clientId: clientIds[0], address: "1847 Oakwood Dr", city: "Austin", state: "TX", zipCode: "78704", lat: 30.2488, lng: -97.7682, status: "scheduled", scheduledDate: daysFromNow(0), notes: "Buyer tour - second showing" },
    { clientId: clientIds[2], address: "98 Pine Lane", city: "Austin", state: "TX", zipCode: "78746", lat: 30.3071, lng: -97.8024, status: "scheduled", scheduledDate: daysFromNow(0), notes: "First showing for investor client" },
    { clientId: clientIds[4], address: "2100 Barton Springs Rd", city: "Austin", state: "TX", zipCode: "78704", lat: 30.2604, lng: -97.7674, status: "scheduled", scheduledDate: daysFromNow(1), notes: "VA buyer - check for condition issues" },
    { clientId: clientIds[0], address: "3500 Greystone Dr", city: "Austin", state: "TX", zipCode: "78731", lat: 30.3602, lng: -97.7661, status: "scheduled", scheduledDate: daysFromNow(0), notes: "New listing for Sarah to see" },
    { clientId: clientIds[6], address: "1100 S Lamar Blvd #204", city: "Austin", state: "TX", zipCode: "78704", lat: 30.2529, lng: -97.7636, status: "scheduled", scheduledDate: daysFromNow(2), notes: "Prospect showing - potential new client" },
    { clientId: clientIds[2], address: "800 W 5th St", city: "Austin", state: "TX", zipCode: "78703", lat: 30.2735, lng: -97.7509, status: "completed", scheduledDate: daysAgo(2), notes: "Client liked the unit, wants to make an offer" },
    { clientId: clientIds[3], address: "4520 Bee Cave Rd", city: "Austin", state: "TX", zipCode: "78746", lat: 30.2968, lng: -97.8143, status: "completed", scheduledDate: daysAgo(7), notes: "Final walkthrough before closing" },
  ];

  const viewingIds: number[] = [];
  for (const v of viewingsData) {
    const [viewing] = await sql`
      INSERT INTO property_viewings (agent_id, client_id, address, city, state, zip_code, latitude, longitude, status, scheduled_date, notes, created_at, updated_at)
      VALUES (${agentId}, ${v.clientId}, ${v.address}, ${v.city}, ${v.state}, ${v.zipCode}, ${v.lat}, ${v.lng}, ${v.status}, ${v.scheduledDate}, ${v.notes}, NOW(), NOW())
      RETURNING id
    `;
    viewingIds.push(viewing.id);
  }
  console.log("Created", viewingIds.length, "property viewings/showings");

  const inspectionItems = [
    { txnId: txnIds[0], category: "roof", description: "Missing shingles on south-facing slope near chimney", severity: "moderate", location: "South roof", status: "sent_for_bids" },
    { txnId: txnIds[0], category: "plumbing", description: "Slow drain in master bathroom sink", severity: "minor", location: "Master bath", status: "approved" },
    { txnId: txnIds[0], category: "electrical", description: "GFCI outlet not tripping in kitchen", severity: "safety", location: "Kitchen", status: "sent_for_bids" },
    { txnId: txnIds[0], category: "hvac", description: "AC unit showing reduced efficiency, 15+ years old", severity: "major", location: "Exterior unit", status: "bids_received" },
    { txnId: txnIds[2], category: "foundation", description: "Hairline crack in garage slab", severity: "minor", location: "Garage", status: "pending_review" },
    { txnId: txnIds[2], category: "exterior", description: "Wood rot at rear deck railing", severity: "moderate", location: "Back deck", status: "pending_review" },
  ];

  for (const item of inspectionItems) {
    await sql`
      INSERT INTO inspection_items (transaction_id, category, description, severity, location, status)
      VALUES (${item.txnId}, ${item.category}, ${item.description}, ${item.severity}, ${item.location}, ${item.status})
    `;
  }
  console.log("Created", inspectionItems.length, "inspection items");

  console.log("\n========================================");
  console.log("  DEMO ACCOUNT READY");
  console.log("========================================");
  console.log("  Email:    demo@homebase.com");
  console.log("  Password: Demo2026!");
  console.log("========================================");
  console.log("  Agent: James Donovan");
  console.log("  Clients:", clientIds.length);
  console.log("  Transactions:", txnIds.length);
  console.log("  Documents:", allDocs.length);
  console.log("  Showings:", viewingIds.length);
  console.log("  Inspection Items:", inspectionItems.length);
  console.log("========================================\n");
}

seed().catch(console.error);
