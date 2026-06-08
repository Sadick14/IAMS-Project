/**
 * Form Validation Utilities
 * ─────────────────────────
 * Reusable validators for forms across the system.
 * Returns error message string or null if valid.
 */

export type ValidationResult = string | null;
export type Validator<T = string> = (value: T) => ValidationResult;

// ── Basic Validators ──

export const required = (label: string): Validator => (value) =>
  value?.trim() ? null : `${label} is required`;

export const minLength = (label: string, min: number): Validator => (value) =>
  value && value.trim().length >= min ? null : `${label} must be at least ${min} characters`;

export const maxLength = (label: string, max: number): Validator => (value) =>
  !value || value.trim().length <= max ? null : `${label} must be at most ${max} characters`;

export const isEmail = (value: string): ValidationResult =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Please enter a valid email address";

export const isHTUEmail = (value: string): ValidationResult =>
  value.endsWith("@htu.edu.gh") || value.endsWith("@st.htu.edu.gh")
    ? null
    : "Must be an HTU email (@htu.edu.gh or @st.htu.edu.gh)";

export const isPhone = (value: string): ValidationResult =>
  /^[\d\s+()-]{7,20}$/.test(value) ? null : "Please enter a valid phone number";

export const isDate = (value: string): ValidationResult =>
  !isNaN(Date.parse(value)) ? null : "Please enter a valid date";

export const isFutureDate = (value: string): ValidationResult => {
  const date = new Date(value);
  return date > new Date() ? null : "Date must be in the future";
};

export const isDateAfter = (label: string, afterDate: string): Validator => (value) => {
  if (!value || !afterDate) return null;
  return new Date(value) > new Date(afterDate) ? null : `${label} must be after ${afterDate}`;
};

// ── Compound Validator ──

export function validate(value: string, ...validators: Validator[]): ValidationResult {
  for (const v of validators) {
    const result = v(value);
    if (result) return result;
  }
  return null;
}

// ── Form-level validation ──

export interface FieldErrors {
  [field: string]: string;
}

export function validateForm(
  fields: Record<string, { value: string; validators: Validator[] }>
): { valid: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  let valid = true;

  for (const [field, { value, validators }] of Object.entries(fields)) {
    const error = validate(value, ...validators);
    if (error) {
      errors[field] = error;
      valid = false;
    }
  }

  return { valid, errors };
}

// ── String Utilities ──

export function getNameInitials(name: string | null | undefined, maxChars = 2): string {
  if (!name || typeof name !== "string") return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, maxChars)
    .toUpperCase();
}
