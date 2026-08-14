/**
 * Credential format rules shared by every scan input.
 *
 * A credential is just a string that a reader "types" into a focused input.
 * USB scanners and USB barcode/QR scanners both behave as keyboards, so
 * the same capture path serves all media — only the accepted shape differs.
 */

export type CredentialType = 'rfid' | 'barcode' | 'qr';

export const CREDENTIAL_TYPES: CredentialType[] = ['rfid', 'barcode', 'qr'];

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  rfid: 'credential',
  barcode: 'Barcode',
  qr: 'QR code',
};

/** Shortest / longest payload we will treat as a scan, per medium. */
export const CREDENTIAL_LENGTH_RULES: Record<CredentialType, { min: number; max: number }> = {
  rfid: { min: 8, max: 20 },
  barcode: { min: 6, max: 48 },
  qr: { min: 6, max: 128 },
};

/** Widest window across all media — used by the generic keyboard-wedge buffer. */
export const ANY_CREDENTIAL_MIN_LENGTH = 6;
export const ANY_CREDENTIAL_MAX_LENGTH = 128;

/**
 * Words that only ever show up when a human is typing into a search box.
 * Kept from the original RFID guard so free text is never mistaken for a scan.
 */
const SEARCH_WORDS = ['search', 'name', 'phone', 'email', 'order', 'attendee'];

/**
 * Accepts Codes, linear barcodes and QR payloads while still rejecting
 * typed search text. Pass a credentialType to tighten the length window.
 */
export const isValidCredentialFormat = (
  raw: string,
  credentialType?: CredentialType
): boolean => {
  const value = (raw ?? '').trim();
  if (!value) return false;

  const { min, max } = credentialType
    ? CREDENTIAL_LENGTH_RULES[credentialType]
    : { min: ANY_CREDENTIAL_MIN_LENGTH, max: ANY_CREDENTIAL_MAX_LENGTH };

  if (value.length < min || value.length > max) return false;

  // Scanners never emit whitespace inside a single read; humans do.
  if (/\s/.test(value)) return false;

  const lower = value.toLowerCase();
  if (SEARCH_WORDS.some((word) => lower.includes(word))) return false;

  // Purely alphabetic short strings are almost always a typed name.
  // Longer alphanumeric-only payloads are legitimate barcode/QR values.
  if (/^[a-zA-Z]+$/.test(value) && value.length < 12) return false;

  // Must look machine-generated: a digit, or a non-alphanumeric delimiter.
  if (!/\d/.test(value) && !/[^a-zA-Z0-9]/.test(value) && value.length < 12) return false;

  return true;
};

/** Best-effort guess of the medium a scanned payload came from. */
export const inferCredentialType = (raw: string): CredentialType => {
  const value = (raw ?? '').trim();
  if (value.length > 48 || /[:/?=]/.test(value)) return 'qr';
  if (/^[0-9A-Fa-f]{8,20}$/.test(value)) return 'rfid';
  return 'barcode';
};

/** Normalizes a payload before it is stored or looked up. */
export const normalizeCredential = (raw: string): string => (raw ?? '').trim();
