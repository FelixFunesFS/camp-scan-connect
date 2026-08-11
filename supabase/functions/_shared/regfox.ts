// Shared RegFox (WebConnex) helpers used by the sync edge functions.
//
// Field paths below were derived from the live form response, not guessed.
// RegFox returns a flat `fieldData` array where a choice question appears
// twice: once as `path: "multipleChoice", value: "rv"` and once as the
// selected child `path: "multipleChoice.rv", value: "true"`.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const ACTIVE_EVENT_FALLBACK = '00000000-0000-0000-0000-000000002026';

export interface RegFoxFieldData {
  label?: string;
  path?: string;
  value?: string;
}

export interface RegFoxRegistrant {
  id: string | number;
  displayId?: string;
  formId?: string | number;
  orderId?: string | number;
  orderDisplayId?: string;
  orderEmail?: string;
  status?: string;
  total?: number;
  amount?: number;
  outstandingAmount?: number;
  currency?: string;
  fieldData?: RegFoxFieldData[];
  checkedIn?: boolean;
  dateCreated?: string;
  dateUpdated?: string;
}

/** Normalise a phone value down to its last 10 digits. */
export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Stable hash of a record so unchanged rows can be skipped. Deliberately a
 * cheap synchronous FNV-1a rather than SHA-256: this runs once per registrant
 * and the edge runtime enforces a hard CPU budget. A collision only ever costs
 * a redundant upsert, never data loss.
 */
export function contentHash(input: unknown): string {
  const stable = JSON.stringify(input, Object.keys(input as object).sort());
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < stable.length; i++) {
    const c = stable.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    stable.length.toString(16)
  );
}

/** Build a path -> value lookup for one registrant. */
export function indexFields(fields?: RegFoxFieldData[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of fields ?? []) {
    if (!f.path) continue;
    const v = f.value == null ? '' : String(f.value).trim();
    if (v !== '') map.set(f.path, v);
  }
  return map;
}

function labelFor(fields: RegFoxFieldData[] | undefined, path: string): string | null {
  const hit = (fields ?? []).find((f) => f.path === path);
  return hit?.label ? String(hit.label).trim() : null;
}

/** First child path selected under a parent question, e.g. `merchandise.tshirt.<size>`. */
function selectedChild(
  fields: RegFoxFieldData[] | undefined,
  parent: string,
): { path: string; label: string | null } | null {
  const prefix = `${parent}.`;
  for (const f of fields ?? []) {
    const p = f.path ?? '';
    if (!p.startsWith(prefix)) continue;
    if (p.endsWith('.variant')) continue;
    const v = f.value == null ? '' : String(f.value).trim();
    if (v === '' || v === '0' || v === 'false') continue;
    return { path: p, label: f.label ? String(f.label).trim() : null };
  }
  return null;
}

/**
 * Accommodation question (`multipleChoice`) combined with the package tier
 * (`registrationOptions` for tents, `registrationOptions3` for RVs) decides
 * the ticket type. "Premium" packages include powered sites.
 */
export function mapAccommodation(f: Map<string, string>): {
  ticket_type: string;
  site_location_assignment: string | null;
} {
  const stay = (f.get('multipleChoice') ?? '').toLowerCase();
  const tentTier = (f.get('registrationOptions') ?? '').toLowerCase();
  const rvTier = (f.get('registrationOptions3') ?? '').toLowerCase();

  if (stay === 'daypassonly') {
    return { ticket_type: 'day_pass', site_location_assignment: null };
  }
  if (stay === 'cabin') {
    return { ticket_type: 'cabin', site_location_assignment: 'cabin' };
  }
  if (stay === 'rv') {
    // premiumRv is a powered space; dryRv / pavedDryCampingRv are not.
    const premium = rvTier.includes('premium');
    return {
      ticket_type: premium ? 'premium_power' : 'rv_site',
      site_location_assignment: 'rv_site',
    };
  }
  // tent, vanrooftop, or unanswered
  const premiumTent = tentTier.includes('option2');
  return {
    ticket_type: premiumTent ? 'premium_power' : 'dry_site',
    site_location_assignment: 'dry_site',
  };
}

/** A meal plan add-on under `merchandise.mealPlan`. */
export function mapMealPlan(f: Map<string, string>): string {
  const qty = f.get('merchandise.mealPlan');
  if (!qty || qty === '0') return 'none';
  for (const key of f.keys()) {
    if (key.startsWith('merchandise.mealPlan.') && key.toLowerCase().includes('premium')) {
      return 'premium';
    }
  }
  return 'standard';
}

/**
 * The waiver field holds `false` when unsigned and the filename of the signed
 * PDF once completed.
 */
export function waiverSigned(f: Map<string, string>): boolean {
  const v = (f.get('waiver') ?? '').toLowerCase();
  if (!v || v === 'false' || v === 'no' || v === '0') return false;
  return v.endsWith('.pdf') || v === 'true' || v === 'yes' || v === 'signed';
}

/** Emergency contact is captured as one free-text "Name & Number" field. */
export function splitEmergencyContact(raw?: string | null): {
  name: string | null;
  phone: string | null;
} {
  if (!raw) return { name: null, phone: null };
  const phone = normalizePhone(raw);
  const name = raw
    .replace(/[+()\-.\d]{7,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[,|/-]\s*$/, '')
    .trim();
  return { name: name || null, phone };
}

/**
 * RegFox statuses seen on this form: completed, canceled, abandoned,
 * pending final payment, transferred.
 */
export function mapRegistrationStatus(raw?: string): string {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('abandon')) return 'abandoned';
  if (v.includes('cancel') || v.includes('refund') || v.includes('void')) return 'cancelled';
  if (v.includes('transferred')) return 'transferred';
  if (v.includes('pending')) return 'pending';
  return 'registered';
}

export function isAbandoned(raw?: string): boolean {
  return (raw ?? '').toLowerCase().includes('abandon');
}

/** Map one RegFox registrant onto an `attendees` row. */
export function mapRegistrant(r: RegFoxRegistrant, eventId: string) {
  const fields = r.fieldData;
  const f = indexFields(fields);

  const accommodation = mapAccommodation(f);
  const emergency = splitEmergencyContact(f.get('emergencyContactNameNumber'));

  // "Additional Night (Thursday)" add-on means they arrive a day early.
  const extraNight = f.get('eventMerchandise.motivationalPoster');
  const earlyAccess = !!extraNight && extraNight !== '0';

  const shirt = selectedChild(fields, 'merchandise.tshirt');
  const extraPerson = (f.get('willYouBeAdding') ?? '').toLowerCase() === 'yesextraperson';

  const dobRaw = f.get('dateOfBirth');
  let dob: string | null = null;
  if (dobRaw && /^\d{4}-\d{2}-\d{2}/.test(dobRaw)) dob = dobRaw.slice(0, 10);

  // Anything not explicitly mapped is preserved rather than dropped.
  const handled = new Set([
    'name2.first', 'name2.last', 'email', 'phone', 'dateOfBirth', 'gender', 'status',
    'address.street1', 'address.city', 'address.state', 'address.postalCode', 'address.country',
    'emergencyContactNameNumber', 'areYouVeteran', 'waiver', 'multipleChoice',
    'registrationOptions', 'registrationOptions3', 'convenienceFee', 'tax', 'checkbox',
  ]);
  const customFields: Record<string, string> = {};
  for (const [path, value] of f) {
    if (handled.has(path)) continue;
    if (path.includes('.lineItemFee')) continue;
    customFields[path] = value.slice(0, 500);
  }

  return {
    event_id: eventId,
    regfox_registration_id: String(r.id),
    regfox_order_id: r.orderId != null ? String(r.orderId) : null,
    regfox_id: String(r.id),
    order_id: r.orderDisplayId ?? (r.orderId != null ? String(r.orderId) : null),

    first_name: f.get('name2.first') || 'Unknown',
    last_name: f.get('name2.last') || 'Unknown',
    email: (f.get('email') ?? r.orderEmail ?? '').toLowerCase() || null,
    phone: normalizePhone(f.get('phone')),
    date_of_birth: dob,
    gender: f.get('gender') ?? null,
    marital_status: f.get('status') ?? null,

    street_address: f.get('address.street1') ?? null,
    city: f.get('address.city') ?? null,
    state: f.get('address.state') ?? null,
    postal_code: f.get('address.postalCode') ?? null,
    country: f.get('address.country') ?? null,

    emergency_contact_name: emergency.name,
    emergency_contact_phone: emergency.phone,

    ticket_type: accommodation.ticket_type,
    site_location_assignment: accommodation.site_location_assignment,
    meal_plan: mapMealPlan(f),
    t_shirt_size: shirt?.label ?? null,

    arrival_day: earlyAccess ? 'Thursday' : 'Friday',
    early_access: earlyAccess,
    is_veteran: (f.get('areYouVeteran') ?? '').toLowerCase() === 'yes',
    waiver_signed: waiverSigned(f),
    additional_guests: extraPerson ? { extra_person: true } : null,

    registration_status: mapRegistrationStatus(r.status),
    custom_fields: customFields,
  };
}

/**
 * Page through the WebConnex registrant search endpoint.
 *
 * The API is cursor-based: it ignores any `page` parameter entirely and
 * instead returns `startingAfter` plus `hasMore`. Paging with `page` silently
 * re-reads the first page forever, so the cursor must be used.
 */
export async function fetchAllRegistrants(
  apiKey: string,
  formId: string,
  onPage?: (loaded: number, total: number) => Promise<void> | void,
): Promise<RegFoxRegistrant[]> {
  const all: RegFoxRegistrant[] = [];
  const seen = new Set<string>();
  let startingAfter: string | number | undefined;
  let reportedTotal = 0;

  // Hard ceiling so a malformed cursor can never spin forever.
  for (let guard = 0; guard < 500; guard++) {
    const url =
      `https://api.webconnex.com/v2/public/search/registrants` +
      `?product=regfox.com&formId=${encodeURIComponent(formId)}&limit=100` +
      (startingAfter !== undefined ? `&startingAfter=${encodeURIComponent(String(startingAfter))}` : '');

    const res = await fetch(url, {
      headers: { apiKey, 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`RegFox API ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const batch: RegFoxRegistrant[] = json?.data ?? [];
    reportedTotal = Number(json?.totalResults ?? 0) || reportedTotal;

    let added = 0;
    for (const rec of batch) {
      const id = String(rec.id);
      if (seen.has(id)) continue;
      seen.add(id);
      all.push(rec);
      added++;
    }

    if (onPage) await onPage(all.length, reportedTotal);

    // No progress means the cursor stopped advancing - stop rather than loop.
    if (!json?.hasMore || batch.length === 0 || added === 0) break;
    startingAfter = json.startingAfter;
    if (startingAfter === undefined || startingAfter === null) break;
  }

  return all;
}