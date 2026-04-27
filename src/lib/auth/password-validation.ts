/**
 * password-validation.ts
 *
 * Pure validation helpers for password rules.
 * Mirrors the rules enforced at signup (minLength=8).
 * No I/O, no Supabase — safe to test in a node environment.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Returns an error message, or null if the password passes. */
export function validatePassword(password: string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

/** Returns an error message if the two passwords differ, or null if they match. */
export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Full reset-form validation: runs both checks in order.
 * Returns the first error found, or null if both pass.
 */
export function validatePasswordReset(
  password: string,
  confirm: string,
): string | null {
  return validatePassword(password) ?? validatePasswordMatch(password, confirm);
}
