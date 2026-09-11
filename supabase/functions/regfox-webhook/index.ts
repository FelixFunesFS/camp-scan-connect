import { createClient } from 'npm:@supabase/supabase-js@2';
import { contentHash, corsHeaders } from '../_shared/regfox.ts';

const MAX_BODY_BYTES = 1_000_000;

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413, headers: corsHeaders });

  const secret = Deno.env.get('REGFOX_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook is not configured', { status: 503, headers: corsHeaders });

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return new Response('Payload too large', { status: 413, headers: corsHeaders });
  }

  const supplied = (req.headers.get('x-regfox-signature') ?? req.headers.get('x-webhook-signature') ?? '').replace(/^sha256=/i, '');
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const direct = req.headers.get('x-webhook-secret') ?? bearer;
  const expected = await hmacHex(secret, rawBody);
  if (!safeEqual(supplied, expected) && !safeEqual(direct, secret)) {
    return new Response('Invalid signature', { status: 401, headers: corsHeaders });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const formId = String(payload.formId ?? payload.form_id ?? payload.form?.id ?? '');
  const registrationId = String(payload.registrantId ?? payload.registrationId ?? payload.registrant_id ?? payload.data?.id ?? '');
  const eventType = String(payload.event ?? payload.eventType ?? payload.type ?? 'registration.changed').slice(0, 120);
  const providerId = String(payload.deliveryId ?? payload.webhookId ?? req.headers.get('x-webhook-id') ?? '');
  const payloadHash = contentHash(payload);
  const deliveryKey = providerId || `${eventType}:${formId}:${registrationId}:${payloadHash}`;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: event } = await supabase.from('events').select('id').eq('regfox_form_id', formId).maybeSingle();
  if (!event) return new Response(JSON.stringify({ success: true, ignored: true, reason: 'unknown_form' }), {
    status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  const { data: delivery, error: insertError } = await supabase
    .from('regfox_webhook_deliveries')
    .insert({ delivery_key: deliveryKey, event_type: eventType, regfox_form_id: formId, regfox_registration_id: registrationId || null, payload_hash: payloadHash })
    .select('id')
    .maybeSingle();
  if (insertError?.code === '23505') return new Response(JSON.stringify({ success: true, duplicate: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (insertError || !delivery) throw new Error(insertError?.message ?? 'Failed to record webhook');

  const { data: syncData, error: syncError } = await supabase.functions.invoke('regfox-sync', {
    body: { sync_type: 'webhook', event_id: event.id, registration_id: registrationId || null },
  });
  await supabase.from('regfox_webhook_deliveries').update({
    status: syncError ? 'error' : syncData?.skipped ? 'ignored' : 'processed',
    sync_id: syncData?.syncId ?? null,
    error_message: syncError?.message ?? syncData?.error ?? null,
    processed_at: new Date().toISOString(),
  }).eq('id', delivery.id);

  return new Response(JSON.stringify({ success: !syncError, accepted: true, sync: syncData }), {
    status: syncError ? 502 : 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});