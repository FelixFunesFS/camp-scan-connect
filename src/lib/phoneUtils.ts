/**
 * Formats a phone number from 10 digits to (XXX) XXX-XXXX format
 * @param phone - The phone number string (10 digits)
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters and get last 10 digits
  const cleaned = phone.replace(/\D/g, '').slice(-10);
  
  if (cleaned.length !== 10) {
    return phone; // Return original if not 10 digits
  }
  
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

/**
 * Formats phone number for display during input (shows partial formatting)
 * @param phone - The current phone input value
 * @returns Partially formatted phone number
 */
export function formatPhoneNumberPartial(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
}