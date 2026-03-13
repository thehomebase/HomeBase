import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function getBase64Photo(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "attached_assets/generated_images", filename);
  const resized = await sharp(filePath).resize(400, 400, { fit: "cover" }).png({ quality: 80 }).toBuffer();
  return `data:image/png;base64,${resized.toString("base64")}`;
}

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const hashedPassword = await hashPassword("Demo2026!");

  const [demoAgent] = await sql`SELECT id FROM users WHERE email = 'demo@homebase.com'`;
  if (!demoAgent) {
    console.error("Demo agent not found! Run seed-demo.ts first.");
    return;
  }
  const agentId = demoAgent.id;
  console.log("Found demo agent, id:", agentId);

  await sql`DELETE FROM home_team_members WHERE user_id = ${agentId}`;
  const existingVendors = await sql`SELECT id FROM users WHERE email LIKE 'demo-vendor-%@homebase.com'`;
  for (const v of existingVendors) {
    await sql`DELETE FROM contractors WHERE vendor_user_id = ${v.id}`;
    await sql`DELETE FROM users WHERE id = ${v.id}`;
  }
  console.log("Cleaned up old team data");

  const teamMembers = [
    {
      email: "demo-vendor-inspector@homebase.com",
      firstName: "Marco", lastName: "Gutierrez",
      role: "vendor",
      profileBio: "Licensed home inspector with 15+ years experience in Central Texas. TREC certified, specializing in residential inspections and FHA/VA compliance checks.",
      profilePhone: "(512) 555-1001",
      photo: "headshot_inspector_final.png",
      contractor: {
        name: "Marco Gutierrez",
        category: "inspector",
        phone: "(512) 555-1001",
        email: "marco@gutierrezinspections.com",
        website: "gutierrezinspections.com",
        city: "Austin", state: "TX", zipCode: "78704",
        description: "Gutierrez Home Inspections — TREC certified, 500+ inspections per year",
        agentRating: 5,
        agentNotes: "Best inspector in Austin. Always thorough and on time.",
      },
      teamCategory: "inspector",
      teamNotes: "My go-to inspector for all transactions"
    },
    {
      email: "demo-vendor-electrician@homebase.com",
      firstName: "Aisha", lastName: "Robinson",
      role: "vendor",
      profileBio: "Master electrician and owner of Robinson Electric. Specializing in residential rewiring, panel upgrades, and smart home installations.",
      profilePhone: "(512) 555-1002",
      photo: "headshot_electrician_final.png",
      contractor: {
        name: "Aisha Robinson",
        category: "electrical",
        phone: "(512) 555-1002",
        email: "aisha@robinsonelectric.com",
        website: "robinsonelectric.com",
        city: "Austin", state: "TX", zipCode: "78745",
        description: "Robinson Electric — Licensed, bonded & insured. Smart home specialists.",
        agentRating: 5,
        agentNotes: "Fast turnaround, great with clients",
      },
      teamCategory: "electrical",
      teamNotes: "Excellent for panel upgrades and inspections"
    },
    {
      email: "demo-vendor-plumber@homebase.com",
      firstName: "Dave", lastName: "Kowalski",
      role: "vendor",
      profileBio: "Licensed master plumber serving Austin for 20 years. From pipe repairs to full bathroom remodels, we do it right the first time.",
      profilePhone: "(512) 555-1003",
      photo: "headshot_plumber_final.png",
      contractor: {
        name: "Dave Kowalski",
        category: "plumbing",
        phone: "(512) 555-1003",
        email: "dave@kowalskiplumbing.com",
        website: "kowalskiplumbing.com",
        city: "Round Rock", state: "TX", zipCode: "78681",
        description: "Kowalski Plumbing — Emergency service available 24/7",
        agentRating: 4,
        agentNotes: "Reliable, fair pricing",
      },
      teamCategory: "plumbing",
      teamNotes: "Great for pre-listing plumbing fixes"
    },
    {
      email: "demo-vendor-lender@homebase.com",
      firstName: "Lisa", lastName: "Tanaka",
      role: "lender",
      profileBio: "Senior Loan Officer at Lone Star Mortgage. NMLS #482910. Specializing in conventional, FHA, VA, and jumbo loans. Fast pre-approvals, competitive rates.",
      profilePhone: "(512) 555-1004",
      photo: "headshot_lender_final.png",
      contractor: {
        name: "Lisa Tanaka",
        category: "other",
        phone: "(512) 555-1004",
        email: "lisa.tanaka@lonestarmortgage.com",
        website: "lonestarmortgage.com/ltanaka",
        city: "Austin", state: "TX", zipCode: "78701",
        description: "Lone Star Mortgage — NMLS #482910 — 98% on-time closing rate",
        agentRating: 5,
        agentNotes: "Best lender I've worked with. Always closes on time.",
      },
      teamCategory: "other",
      teamNotes: "Preferred lender — fast pre-approvals"
    },
    {
      email: "demo-vendor-roofer@homebase.com",
      firstName: "Bill", lastName: "Henderson",
      role: "vendor",
      profileBio: "Owner of Henderson Roofing, serving Central Texas since 1998. Insurance claims specialist. GAF Master Elite certified.",
      profilePhone: "(512) 555-1005",
      photo: "headshot_roofer_final.png",
      contractor: {
        name: "Bill Henderson",
        category: "roofing",
        phone: "(512) 555-1005",
        email: "bill@hendersonroofing.com",
        website: "hendersonroofing.com",
        city: "Cedar Park", state: "TX", zipCode: "78613",
        description: "Henderson Roofing — GAF Master Elite, insurance claim experts",
        agentRating: 4,
        agentNotes: "Great for storm damage and insurance claims",
      },
      teamCategory: "roofing",
      teamNotes: "Insurance claim specialist"
    },
    {
      email: "demo-vendor-hvac@homebase.com",
      firstName: "Rajan", lastName: "Patel",
      role: "vendor",
      profileBio: "HVAC technician and owner of CoolAir Solutions. EPA certified. Specializing in energy-efficient system installations and preventive maintenance.",
      profilePhone: "(512) 555-1006",
      photo: "headshot_hvac_final.png",
      contractor: {
        name: "Rajan Patel",
        category: "hvac",
        phone: "(512) 555-1006",
        email: "rajan@coolairsolutions.com",
        website: "coolairsolutions.com",
        city: "Austin", state: "TX", zipCode: "78758",
        description: "CoolAir Solutions — Energy-efficient HVAC for Texas homes",
        agentRating: 5,
        agentNotes: "Fast response for emergency AC repairs",
      },
      teamCategory: "hvac",
      teamNotes: "Go-to for AC repairs and replacements"
    },
    {
      email: "demo-vendor-handyman@homebase.com",
      firstName: "Marcus", lastName: "Thompson",
      role: "vendor",
      profileBio: "General contractor and handyman with 18 years experience. From minor repairs to full renovations, no job is too big or too small.",
      profilePhone: "(512) 555-1007",
      photo: "headshot_handyman_final.png",
      contractor: {
        name: "Marcus Thompson",
        category: "handyman",
        phone: "(512) 555-1007",
        email: "marcus@thompsonhomeservices.com",
        website: "thompsonhomeservices.com",
        city: "Austin", state: "TX", zipCode: "78741",
        description: "Thompson Home Services — Your one-call solution for home repairs",
        agentRating: 4,
        agentNotes: "Very versatile, handles anything",
      },
      teamCategory: "handyman",
      teamNotes: "Can handle any pre-listing repair"
    },
    {
      email: "demo-vendor-landscaper@homebase.com",
      firstName: "Katie", lastName: "O'Brien",
      role: "vendor",
      profileBio: "Landscape architect specializing in drought-tolerant Texas landscaping. From curb appeal makeovers to full backyard transformations.",
      profilePhone: "(512) 555-1008",
      photo: "headshot_landscaper_final.png",
      contractor: {
        name: "Katie O'Brien",
        category: "landscaping",
        phone: "(512) 555-1008",
        email: "katie@greenscapeaustin.com",
        website: "greenscapeaustin.com",
        city: "Austin", state: "TX", zipCode: "78702",
        description: "GreenScape Austin — Native plants, xeriscaping, curb appeal",
        agentRating: 5,
        agentNotes: "Amazing for pre-listing curb appeal",
      },
      teamCategory: "landscaping",
      teamNotes: "Best for curb appeal transformations"
    },
    {
      email: "demo-vendor-title@homebase.com",
      firstName: "Maria", lastName: "Vasquez",
      role: "vendor",
      profileBio: "Senior Title Officer at Capitol Title Group. 12 years experience handling residential closings. Known for smooth, stress-free closing experiences.",
      profilePhone: "(512) 555-1009",
      photo: "headshot_title_final.png",
      contractor: {
        name: "Maria Vasquez",
        category: "other",
        phone: "(512) 555-1009",
        email: "maria@capitoltitlegroup.com",
        website: "capitoltitlegroup.com",
        city: "Austin", state: "TX", zipCode: "78701",
        description: "Capitol Title Group — Seamless closings, every time",
        agentRating: 5,
        agentNotes: "Smoothest closings in town",
      },
      teamCategory: "other",
      teamNotes: "Preferred title company"
    },
    {
      email: "demo-vendor-pest@homebase.com",
      firstName: "Tyler", lastName: "Reed",
      role: "vendor",
      profileBio: "Licensed pest control specialist. WDI/termite inspections, treatment, and prevention. Same-day service available.",
      profilePhone: "(512) 555-1010",
      photo: "headshot_pest_final.png",
      contractor: {
        name: "Tyler Reed",
        category: "pest_control",
        phone: "(512) 555-1010",
        email: "tyler@shieldpestcontrol.com",
        website: "shieldpestcontrol.com",
        city: "Pflugerville", state: "TX", zipCode: "78660",
        description: "Shield Pest Control — WDI inspections and termite treatment",
        agentRating: 4,
        agentNotes: "Quick turnaround on WDI reports",
      },
      teamCategory: "pest_control",
      teamNotes: "Fast WDI inspection reports"
    },
  ];

  for (const member of teamMembers) {
    console.log(`Processing ${member.firstName} ${member.lastName}...`);
    
    const photoBase64 = await getBase64Photo(member.photo);
    
    const [user] = await sql`
      INSERT INTO users (email, password, first_name, last_name, role, email_verified, verification_status, profile_bio, profile_phone, profile_photo_url)
      VALUES (${member.email}, ${hashedPassword}, ${member.firstName}, ${member.lastName}, ${member.role}, true, 'verified', ${member.profileBio}, ${member.profilePhone}, ${photoBase64})
      RETURNING id
    `;

    const c = member.contractor;
    const [contractor] = await sql`
      INSERT INTO contractors (name, category, phone, email, website, city, state, zip_code, description, agent_rating, agent_notes, vendor_user_id, agent_id, created_at, updated_at)
      VALUES (${c.name}, ${c.category}, ${c.phone}, ${c.email}, ${c.website}, ${c.city}, ${c.state}, ${c.zipCode}, ${c.description}, ${c.agentRating}, ${c.agentNotes}, ${user.id}, ${agentId}, NOW(), NOW())
      RETURNING id
    `;

    await sql`
      INSERT INTO home_team_members (user_id, contractor_id, category, notes)
      VALUES (${agentId}, ${contractor.id}, ${member.teamCategory}, ${member.teamNotes})
    `;

    console.log(`  Created: user=${user.id}, contractor=${contractor.id}`);
  }

  console.log("\n========================================");
  console.log("  TEAM MEMBERS SEEDED");
  console.log("========================================");
  console.log(`  ${teamMembers.length} team members with profile photos`);
  console.log("  Categories: inspector, electrical, plumbing,");
  console.log("    lender, roofing, hvac, handyman,");
  console.log("    landscaping, title, pest control");
  console.log("========================================\n");
}

seed().catch(console.error);
