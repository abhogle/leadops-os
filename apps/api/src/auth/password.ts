import bcrypt from "bcrypt";

/**
 * Number of salt rounds for bcrypt hashing
 * Higher = more secure but slower
 * 10-12 is recommended for production
 */
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param password - Plaintext password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a hashed password
 * @param password - Plaintext password
 * @param hashedPassword - Hashed password from database
 * @returns Promise<boolean> - True if passwords match
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
