/**
 * Secure password hashing using SHA-256 via Web Crypto API.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Standard client-side email format validator.
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Standard Teudat Zehut 9-digit validation rule.
 */
export function validateTeudatZehut(tz: string): boolean {
  return /^\d{9}$/.test(tz);
}
