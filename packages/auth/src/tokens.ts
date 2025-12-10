import jwt from "jsonwebtoken";
import type { LeadOpsAuthToken } from "./types.js";

const DEFAULT_EXPIRATION = "12h"; // temporary; configurable later

export function signAuthToken(
  payload: Omit<LeadOpsAuthToken, "iat" | "exp">
): string {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET not set");
  }

  return jwt.sign(
    {
      ...payload,
      v: 1,
    },
    process.env.AUTH_SECRET,
    { expiresIn: DEFAULT_EXPIRATION }
  );
}

export function verifyAuthToken(
  token: string
): LeadOpsAuthToken | null {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET not set");
  }

  try {
    return jwt.verify(token, process.env.AUTH_SECRET) as LeadOpsAuthToken;
  } catch {
    return null;
  }
}
