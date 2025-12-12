import { orgPhoneNumbers } from "@leadops/db";
import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Extract area code from phone number
 * Assumes E.164 format: +1XXXXXXXXXX
 */
function extractAreaCode(phone: string): string | null {
  // Remove + and country code (1) for US numbers
  const digits = phone.replace(/\D/g, "");

  // For US numbers (11 digits starting with 1), area code is digits 1-3
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.substring(1, 4);
  }

  // For 10-digit US numbers, area code is first 3 digits
  if (digits.length === 10) {
    return digits.substring(0, 3);
  }

  return null;
}

/**
 * Extract US state/region from phone number area code
 * This is a simplified mapping - in production, use a complete area code database
 */
function getRegionFromAreaCode(areaCode: string): string | null {
  // Simplified mapping for common area codes
  const regionMap: Record<string, string> = {
    "212": "NY",
    "213": "CA",
    "214": "TX",
    "310": "CA",
    "312": "IL",
    "404": "GA",
    "415": "CA",
    "512": "TX",
    "617": "MA",
    "702": "NV",
    "713": "TX",
    "818": "CA",
    "917": "NY",
    // Add more as needed
  };

  return regionMap[areaCode] || null;
}

/**
 * Local Presence Dialing Number Selection
 *
 * Algorithm:
 * 1. Exact area code match
 * 2. Same region
 * 3. Default number
 * 4. Any active number
 * 5. Error if none found
 *
 * Fallback: if org_twilio_config.messaging_service_sid exists → bypass logic
 */
export async function selectSenderNumber(
  db: NodePgDatabase,
  orgId: string,
  leadPhone: string
): Promise<string> {
  const leadAreaCode = extractAreaCode(leadPhone);

  // Try 1: Exact area code match
  if (leadAreaCode) {
    const [exactMatch] = await db
      .select({ phoneNumber: orgPhoneNumbers.phoneNumber })
      .from(orgPhoneNumbers)
      .where(
        and(
          eq(orgPhoneNumbers.orgId, orgId),
          eq(orgPhoneNumbers.areaCode, leadAreaCode),
          eq(orgPhoneNumbers.isActive, true)
        )
      )
      .limit(1);

    if (exactMatch) {
      return exactMatch.phoneNumber;
    }
  }

  // Try 2: Same region
  if (leadAreaCode) {
    const region = getRegionFromAreaCode(leadAreaCode);
    if (region) {
      const [regionMatch] = await db
        .select({ phoneNumber: orgPhoneNumbers.phoneNumber })
        .from(orgPhoneNumbers)
        .where(
          and(
            eq(orgPhoneNumbers.orgId, orgId),
            eq(orgPhoneNumbers.region, region),
            eq(orgPhoneNumbers.isActive, true)
          )
        )
        .limit(1);

      if (regionMatch) {
        return regionMatch.phoneNumber;
      }
    }
  }

  // Try 3: Default number
  const [defaultNumber] = await db
    .select({ phoneNumber: orgPhoneNumbers.phoneNumber })
    .from(orgPhoneNumbers)
    .where(
      and(
        eq(orgPhoneNumbers.orgId, orgId),
        eq(orgPhoneNumbers.isDefault, true),
        eq(orgPhoneNumbers.isActive, true)
      )
    )
    .limit(1);

  if (defaultNumber) {
    return defaultNumber.phoneNumber;
  }

  // Try 4: Any active number
  const [anyActive] = await db
    .select({ phoneNumber: orgPhoneNumbers.phoneNumber })
    .from(orgPhoneNumbers)
    .where(
      and(
        eq(orgPhoneNumbers.orgId, orgId),
        eq(orgPhoneNumbers.isActive, true)
      )
    )
    .limit(1);

  if (anyActive) {
    return anyActive.phoneNumber;
  }

  // No number found
  throw new Error(
    "No active phone number found for organization. Please configure at least one phone number."
  );
}
