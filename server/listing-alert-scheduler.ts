import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendSMS } from "./twilio-service";
import { sendGmailEmail } from "./gmail-service";
import { notify } from "./notification-helper";

interface AlertRow {
  id: number;
  user_id: number;
  name: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bathrooms_min: number | null;
  property_type: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  notify_in_app: boolean;
}

interface UserRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile_phone: string | null;
}

interface SavedPropertyRow {
  id: number;
  user_id: number;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  last_known_price: number | null;
  listing_id: string | null;
  price_alert_enabled: boolean;
}

interface RentCastListing {
  id: string;
  formattedAddress: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  status: string;
  listedDate: string;
  daysOnMarket: number;
  city: string;
  state: string;
  zipCode: string;
}

interface PriceChange {
  address: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  changePercent: string;
}

function buildSearchKey(alert: AlertRow): string {
  const parts: string[] = [];
  if (alert.city) parts.push(`city=${alert.city.toLowerCase()}`);
  if (alert.state) parts.push(`state=${alert.state.toUpperCase()}`);
  if (alert.zip_code) parts.push(`zip=${alert.zip_code}`);
  return parts.join("&");
}

function buildRentCastParams(alert: AlertRow): URLSearchParams {
  const params = new URLSearchParams();
  if (alert.city) params.set("city", alert.city);
  if (alert.state) params.set("state", alert.state);
  if (alert.zip_code) params.set("zipCode", alert.zip_code);
  params.set("status", "Active");
  params.set("limit", "50");
  return params;
}

function listingMatchesAlert(listing: RentCastListing, alert: AlertRow): boolean {
  if (alert.min_price && listing.price < alert.min_price) return false;
  if (alert.max_price && listing.price > alert.max_price) return false;
  if (alert.bedrooms_min && listing.bedrooms < alert.bedrooms_min) return false;
  if (alert.bathrooms_min && listing.bathrooms < alert.bathrooms_min) return false;
  if (alert.property_type && listing.propertyType && listing.propertyType.toLowerCase() !== alert.property_type.toLowerCase()) return false;
  return true;
}

async function fetchListings(params: URLSearchParams): Promise<RentCastListing[]> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) {
    console.error("[ListingAlerts] RentCast API key not configured");
    return [];
  }

  const url = `https://api.rentcast.io/v1/listings/sale?${params.toString()}`;
  console.log(`[ListingAlerts] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
    });

    if (!response.ok) {
      console.error(`[ListingAlerts] API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[ListingAlerts] Fetch error:", error);
    return [];
  }
}

async function fetchPropertyByAddress(address: string): Promise<RentCastListing | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;

  try {
    const params = new URLSearchParams({ address });
    const url = `https://api.rentcast.io/v1/properties?${params.toString()}`;
    const response = await fetch(url, {
      headers: { "X-Api-Key": apiKey, "Accept": "application/json" }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) return data[0];
    if (data && data.id) return data;
    return null;
  } catch {
    return null;
  }
}

function formatListingsSummary(listings: RentCastListing[], alertName: string): string {
  const header = `🏠 ${listings.length} new listing${listings.length !== 1 ? "s" : ""} matching "${alertName}":\n\n`;
  const items = listings.slice(0, 5).map((l, i) =>
    `${i + 1}. ${l.formattedAddress}\n   $${l.price?.toLocaleString()} | ${l.bedrooms}bd/${l.bathrooms}ba | ${l.squareFootage?.toLocaleString() || "N/A"} sqft`
  ).join("\n\n");
  const more = listings.length > 5 ? `\n\n...and ${listings.length - 5} more. Check the app for full details.` : "";
  return header + items + more;
}

function formatPriceChangesSummary(changes: PriceChange[]): string {
  const header = `💰 ${changes.length} price change${changes.length !== 1 ? "s" : ""} on your saved properties:\n\n`;
  const items = changes.map((c, i) => {
    const direction = c.change < 0 ? "↓" : "↑";
    return `${i + 1}. ${c.address}\n   $${c.oldPrice.toLocaleString()} → $${c.newPrice.toLocaleString()} (${direction} ${c.changePercent})`;
  }).join("\n\n");
  return header + items;
}

function formatListingsHtml(listings: RentCastListing[], alertName: string): string {
  const rows = listings.slice(0, 10).map(l => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${l.formattedAddress}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">$${l.price?.toLocaleString()}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${l.bedrooms}bd/${l.bathrooms}ba</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${l.squareFootage?.toLocaleString() || "N/A"} sqft</td>
    </tr>
  `).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a1a2e">🏠 New Listings Alert: ${alertName}</h2>
      <p>${listings.length} new listing${listings.length !== 1 ? "s" : ""} match your search criteria.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Address</th>
            <th style="padding:8px;text-align:left">Price</th>
            <th style="padding:8px;text-align:left">Beds/Baths</th>
            <th style="padding:8px;text-align:left">Size</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${listings.length > 10 ? `<p>...and ${listings.length - 10} more listings. Log in to HomeBase to see all results.</p>` : ""}
      <p style="color:#666;font-size:12px;margin-top:24px">You're receiving this because you set up a listing alert on HomeBase. Log in to manage your alerts.</p>
    </div>
  `;
}

function formatPriceChangesHtml(changes: PriceChange[]): string {
  const rows = changes.map(c => {
    const direction = c.change < 0 ? "↓" : "↑";
    const color = c.change < 0 ? "#16a34a" : "#dc2626";
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${c.address}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">$${c.oldPrice.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">$${c.newPrice.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:${color};font-weight:600">${direction} ${c.changePercent}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a1a2e">💰 Price Changes on Your Saved Properties</h2>
      <p>${changes.length} of your saved properties had a price change.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Address</th>
            <th style="padding:8px;text-align:left">Was</th>
            <th style="padding:8px;text-align:left">Now</th>
            <th style="padding:8px;text-align:left">Change</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#666;font-size:12px;margin-top:24px">You're receiving this because you have saved properties with price alerts enabled on HomeBase.</p>
    </div>
  `;
}

async function sendAlertNotifications(
  userId: number,
  alert: AlertRow,
  title: string,
  summary: string,
  html: string,
  subject: string,
  link: string
): Promise<void> {
  const userResult = await db.execute(sql`
    SELECT id, email, first_name, last_name, profile_phone FROM users WHERE id = ${userId}
  `);
  const user = userResult.rows[0] as unknown as UserRow;
  if (!user) return;

  if (alert.notify_in_app) {
    await notify(userId, "listing_alert", title, summary, link);
  }

  if (alert.notify_sms && user.profile_phone) {
    try {
      const truncated = summary.length > 1500 ? summary.substring(0, 1497) + "..." : summary;
      await sendSMS(user.profile_phone, truncated);
      console.log(`[ListingAlerts] SMS sent to user ${userId}`);
    } catch (err) {
      console.error(`[ListingAlerts] SMS failed for user ${userId}:`, err);
    }
  }

  if (alert.notify_email && user.email) {
    try {
      await sendGmailEmail(userId, user.email, subject, html);
      console.log(`[ListingAlerts] Email sent to user ${userId}`);
    } catch (err) {
      console.error(`[ListingAlerts] Email failed for user ${userId}:`, err);
    }
  }
}

async function processPriceChanges(): Promise<void> {
  console.log("[ListingAlerts] Checking saved properties for price changes...");

  try {
    const propsResult = await db.execute(sql`
      SELECT sp.id, sp.user_id, sp.street_address, sp.city, sp.state, sp.zip_code,
             sp.last_known_price, sp.listing_id, sp.price_alert_enabled
      FROM saved_properties sp
      WHERE sp.price_alert_enabled = true AND sp.street_address IS NOT NULL
    `);
    const savedProps = propsResult.rows as unknown as SavedPropertyRow[];

    if (savedProps.length === 0) {
      console.log("[ListingAlerts] No saved properties with price alerts");
      return;
    }

    const userGroups = new Map<number, SavedPropertyRow[]>();
    for (const prop of savedProps) {
      if (!userGroups.has(prop.user_id)) userGroups.set(prop.user_id, []);
      userGroups.get(prop.user_id)!.push(prop);
    }

    let apiCallsUsed = 0;
    const MAX_PRICE_API_CALLS = 2;

    for (const [userId, props] of userGroups) {
      const priceChanges: PriceChange[] = [];

      const alertResult = await db.execute(sql`
        SELECT * FROM listing_alerts WHERE user_id = ${userId} AND is_active = true LIMIT 1
      `);
      const alert = alertResult.rows[0] as unknown as AlertRow | undefined;

      for (const prop of props) {
        if (apiCallsUsed >= MAX_PRICE_API_CALLS) break;

        const address = [prop.street_address, prop.city, prop.state, prop.zip_code].filter(Boolean).join(", ");
        if (!address) continue;

        const listing = await fetchPropertyByAddress(address);
        apiCallsUsed++;

        if (!listing || !listing.price) continue;

        if (prop.last_known_price && prop.last_known_price !== listing.price) {
          const change = listing.price - prop.last_known_price;
          const pct = Math.abs((change / prop.last_known_price) * 100).toFixed(1) + "%";
          priceChanges.push({
            address: listing.formattedAddress || address,
            oldPrice: prop.last_known_price,
            newPrice: listing.price,
            change,
            changePercent: pct,
          });
        }

        await db.execute(sql`
          UPDATE saved_properties SET last_known_price = ${listing.price}, listing_id = ${listing.id}
          WHERE id = ${prop.id}
        `);
      }

      if (priceChanges.length > 0 && alert) {
        console.log(`[ListingAlerts] User ${userId}: ${priceChanges.length} price change(s) detected`);
        const summary = formatPriceChangesSummary(priceChanges);
        const html = formatPriceChangesHtml(priceChanges);
        await sendAlertNotifications(
          userId,
          alert,
          `${priceChanges.length} price change${priceChanges.length !== 1 ? "s" : ""} on saved properties`,
          summary,
          html,
          `💰 Price Changes on Saved Properties`,
          "/listing-alerts"
        );
      }

      if (apiCallsUsed >= MAX_PRICE_API_CALLS) {
        console.log(`[ListingAlerts] Reached max price check API calls (${MAX_PRICE_API_CALLS})`);
        break;
      }
    }

    console.log(`[ListingAlerts] Price check complete. Used ${apiCallsUsed} API call(s).`);
  } catch (error) {
    console.error("[ListingAlerts] Price check error:", error);
  }
}

async function processNewListingAlerts(): Promise<void> {
  console.log("[ListingAlerts] Checking for new listings matching alerts...");

  try {
    const alertsResult = await db.execute(sql`
      SELECT * FROM listing_alerts WHERE is_active = true
    `);
    const alerts = alertsResult.rows as unknown as AlertRow[];

    if (alerts.length === 0) {
      console.log("[ListingAlerts] No active alerts found");
      return;
    }

    console.log(`[ListingAlerts] Processing ${alerts.length} active alert(s)`);

    const searchGroups = new Map<string, { params: URLSearchParams; alerts: AlertRow[] }>();
    for (const alert of alerts) {
      const key = buildSearchKey(alert);
      if (!searchGroups.has(key)) {
        searchGroups.set(key, { params: buildRentCastParams(alert), alerts: [alert] });
      } else {
        searchGroups.get(key)!.alerts.push(alert);
      }
    }

    let apiCallsUsed = 0;
    const MAX_API_CALLS = 2;

    for (const [, group] of searchGroups) {
      if (apiCallsUsed >= MAX_API_CALLS) {
        console.log(`[ListingAlerts] Reached max API calls (${MAX_API_CALLS})`);
        break;
      }

      const allListings = await fetchListings(group.params);
      apiCallsUsed++;

      if (allListings.length === 0) {
        for (const alert of group.alerts) {
          await db.execute(sql`UPDATE listing_alerts SET last_checked_at = NOW(), last_match_count = 0 WHERE id = ${alert.id}`);
        }
        continue;
      }

      for (const alert of group.alerts) {
        try {
          const matchedListings = allListings.filter(l => listingMatchesAlert(l, alert));

          if (matchedListings.length === 0) {
            await db.execute(sql`UPDATE listing_alerts SET last_checked_at = NOW(), last_match_count = 0 WHERE id = ${alert.id}`);
            continue;
          }

          const existingResult = await db.execute(sql`
            SELECT listing_id FROM listing_alert_results
            WHERE alert_id = ${alert.id} AND notified_at > NOW() - INTERVAL '7 days'
          `);
          const existingIds = new Set((existingResult.rows as any[]).map(r => r.listing_id));
          const newListings = matchedListings.filter(l => !existingIds.has(l.id));

          if (newListings.length === 0) {
            await db.execute(sql`UPDATE listing_alerts SET last_checked_at = NOW(), last_match_count = 0 WHERE id = ${alert.id}`);
            continue;
          }

          console.log(`[ListingAlerts] Alert "${alert.name}" (user ${alert.user_id}): ${newListings.length} new listing(s)`);

          for (const listing of newListings) {
            await db.execute(sql`
              INSERT INTO listing_alert_results (alert_id, user_id, listing_id, listing_address, listing_price, listing_bedrooms, listing_bathrooms, listing_data)
              VALUES (${alert.id}, ${alert.user_id}, ${listing.id}, ${listing.formattedAddress}, ${listing.price}, ${listing.bedrooms}, ${listing.bathrooms}, ${JSON.stringify(listing)}::json)
            `);
          }

          const summary = formatListingsSummary(newListings, alert.name);
          const html = formatListingsHtml(newListings, alert.name);
          await sendAlertNotifications(
            alert.user_id,
            alert,
            `${newListings.length} new listing${newListings.length !== 1 ? "s" : ""} found`,
            summary,
            html,
            `🏠 ${newListings.length} New Listing${newListings.length !== 1 ? "s" : ""} - ${alert.name}`,
            "/listing-alerts"
          );

          await db.execute(sql`UPDATE listing_alerts SET last_checked_at = NOW(), last_match_count = ${newListings.length} WHERE id = ${alert.id}`);
        } catch (err) {
          console.error(`[ListingAlerts] Error processing alert ${alert.id}:`, err);
        }
      }
    }

    console.log(`[ListingAlerts] New listing check complete. Used ${apiCallsUsed} API call(s).`);
  } catch (error) {
    console.error("[ListingAlerts] New listing check error:", error);
  }
}

async function processAlerts(): Promise<void> {
  console.log("[ListingAlerts] Starting daily listing alert check...");
  await processNewListingAlerts();
  await processPriceChanges();
  console.log("[ListingAlerts] Daily check complete.");
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startListingAlertScheduler(): void {
  if (schedulerInterval) {
    console.log("[ListingAlerts] Scheduler already running");
    return;
  }

  console.log("[ListingAlerts] Starting listing alert scheduler (runs every 24 hours)");

  setTimeout(() => {
    processAlerts().catch(err => console.error("[ListingAlerts] Initial run error:", err));
  }, 30 * 1000);

  schedulerInterval = setInterval(() => {
    processAlerts().catch(err => console.error("[ListingAlerts] Scheduled run error:", err));
  }, 24 * 60 * 60 * 1000);
}

export function stopListingAlertScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[ListingAlerts] Scheduler stopped");
  }
}
