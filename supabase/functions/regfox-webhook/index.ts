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

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) return new Response('Payload too large', { status: 413, headers: corsHeaders });

  const webhookSecret = Deno.env.get('REGFOX_WEBHOOK_SECRET')?.trim() || undefined;
  const appToken = Deno.env.get('REGFOX_APP_TOKEN')?.trim() || undefined;
  const appKey = Deno.env.get('REGFOX_APP_KEY')?.trim() || undefined;
  if (!webhookSecret && !appToken && !appKey) {
    return new Response('Webhook is not configured', { status: 503, headers: corsHeaders });
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return new Response('Payload too large', { status: 413, headers: corsHeaders });
  }

  const suppliedSignature = (
    req.headers.get('x-webconnex-signature') ??
    req.headers.get('x-regfox-signature') ??
    req.headers.get('x-webhook-signature') ??
    ''
  ).replace(/^sha256=/i, '').trim();

  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const directSecret = (
    req.headers.get('x-webhook-secret') ??
    req.headers.get('x-regfox-app-token') ??
    req.headers.get('x-api-token') ??
    req.headers.get('x-app-token') ??
    bearer
  ).trim();

  // Try every configured secret: RegFox may sign with the signing secret or the app key.
  const candidates: Array<{ name: string; value: string }> = [];
  if (webhookSecret) candidates.push({ name: 'REGFOX_WEBHOOK_SECRET', value: webhookSecret });
  if (appKey) candidates.push({ name: 'REGFOX_APP_KEY', value: appKey });
  if (appToken) candidates.push({ name: 'REGFOX_APP_TOKEN', value: appToken });

  let signatureValid = false;
  let matchedSecret: string | null = null;
  if (suppliedSignature) {
    for (const candidate of candidates) {
      const expected = await hmacHex(candidate.value, rawBody);
      if (safeEqual(suppliedSignature.toLowerCase(), expected)) {
        signatureValid = true;
        matchedSecret = candidate.name;
        break;
      }
    }
  }

  let tokenValid = false;
  if (!signatureValid && directSecret) {
    tokenValid = candidates.some((candidate) => safeEqual(directSecret, candidate.value));
    if (tokenValid) matchedSecret = 'header-token';
  }

  if (!signatureValid && !tokenValid) {
    console.error('regfox-webhook: rejected request', {
      hasSignature: !!suppliedSignature,
      hasToken: !!directSecret,
      configured: candidates.map((c) => c.name),
    });
    return new Response('Invalid signature or token', { status: 401, headers: corsHeaders });
  }
  console.log('regfox-webhook: authorized via', matchedSecret);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const meta = typeof payload.meta === 'object' && payload.meta ? payload.meta as Record<string, unknown> : {};
  if (appKey && typeof meta.appKey === 'string' && meta.appKey.trim() && !safeEqual(meta.appKey.trim(), appKey)) {
    return new Response('Invalid app key', { status: 401, headers: corsHeaders });
  }

  const form = typeof payload.form === 'object' && payload.form ? payload.form as Record<string, unknown> : {};
  const data = typeof payload.data === 'object' && payload.data ? payload.data as Record<string, unknown> : {};
  const formId = String(payload.formId ?? payload.form_id ?? form.id ?? '');
  const registrationId = String(payload.registrantId ?? payload.registrationId ?? payload.registrant_id ?? data.id ?? '');
  const eventType = String(
    payload.event ?? payload.eventType ?? payload.type ?? req.headers.get('x-webconnex-event') ?? 'registration.changed',
  ).slice(0, 120);
  const providerId = String(
    req.headers.get('x-webconnex-delivery') ??
    payload.deliveryId ??
    payload.webhookId ??
    req.headers.get('x-webhook-id') ??
    '',
  );
  const payloadHash = contentHash(payload);
  const deliveryKey = providerId || `${eventType}:${formId}:${registrationId}:${payloadHash}`;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Ping / test deliveries: acknowledge without touching the roster.
  if (eventType.toLowerCase() === 'ping' || eventType.toLowerCase() === 'test') {
    await supabase.from('regfox_webhook_deliveries').insert({
      delivery_key: deliveryKey,
      event_type: eventType,
      regfox_form_id: formId || null,
      regfox_registration_id: null,
      payload_hash: payloadHash,
      status: 'ignored',
      processed_at: new Date().toISOString(),
    });
    return json({ success: true, ping: true }, 200);
  }

  const { data: event } = await supabase.from('events').select('id').eq('regfox_form_id', formId).maybeSingle();
  if (!event) return json({ success: true, ignored: true, reason: 'unknown_form' }, 202);

  // A re-delivery of the same ID is a duplicate only when we already handled it.
  // RegFox re-sends failures with the same ID, so those must be allowed through.
  const { data: priorDelivery } = await supabase
    .from('regfox_webhook_deliveries')
    .select('id, status')
    .eq('delivery_key', deliveryKey)
    .maybeSingle();

  let deliveryId: string;
  if (priorDelivery) {
    if (['processed', 'ignored', 'processing'].includes(priorDelivery.status)) {
      return json({ success: true, duplicate: true, status: priorDelivery.status }, 200);
    }
    deliveryId = priorDelivery.id as string;
    await supabase
      .from('regfox_webhook_deliveries')
      .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', deliveryId);
  } else {
    const { data: delivery, error: insertError } = await supabase
      .from('regfox_webhook_deliveries')
      .insert({ delivery_key: deliveryKey, event_type: eventType, regfox_form_id: formId, regfox_registration_id: registrationId || null, payload_hash: payloadHash })
      .select('id')
      .maybeSingle();
    if (insertError?.code === '23505') return json({ success: true, duplicate: true }, 200);
    if (insertError || !delivery) {
      console.error('regfox-webhook: failed to record delivery', insertError);
      return json({ success: false, error: insertError?.message ?? 'Failed to record webhook' }, 500);
    }
    deliveryId = delivery.id as string;
  }

  // Debounce: a full roster sync that just finished already covers this change.
  const { data: recentSync } = await supabase
    .from('regfox_sync_log')
    .select('id, sync_completed_at')
    .eq('event_id', event.id)
    .eq('status', 'success')
    .gte('sync_completed_at', new Date(Date.now() - 60_000).toISOString())
    .order('sync_completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentSync) {
    await supabase.from('regfox_webhook_deliveries').update({
      status: 'ignored',
      sync_id: recentSync.id,
      error_message: 'Covered by a sync that completed moments earlier',
      processed_at: new Date().toISOString(),
    }).eq('id', deliveryId);
    return json({ success: true, debounced: true, syncId: recentSync.id }, 200);
  }


  const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/regfox-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
      'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
    },
    body: JSON.stringify({ sync_type: 'webhook', event_id: event.id, registration_id: registrationId || null }),
  });
  const syncData = await syncResponse.json().catch(() => ({}));
  const deferred = syncResponse.status === 409;
  const syncError = syncResponse.ok || deferred ? null : new Error(syncData?.error ?? `Sync returned ${syncResponse.status}`);

  await supabase.from('regfox_webhook_deliveries').update({
    status: syncError ? 'error' : deferred ? 'deferred' : syncData?.skipped ? 'ignored' : 'processed',
    sync_id: syncData?.syncId ?? null,
    error_message: syncError?.message ?? syncData?.error ?? (deferred ? 'Sync already running; hourly reconciliation will catch up' : null),
    processed_at: new Date().toISOString(),
  }).eq('id', delivery.id);

  return json({ success: !syncError, accepted: true, deferred, sync: syncData }, syncError ? 502 : 202);
});
