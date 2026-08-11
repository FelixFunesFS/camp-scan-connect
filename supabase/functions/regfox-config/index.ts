import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/regfox.ts';

/**
 * Reports which event the configured RegFox form is linked to, and lets an
 * admin bind it to a specific event. A form ID is a public form identifier,
 * not a credential.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const formId = Deno.env.get('REGFOX_FORM_ID');
    if (!formId) throw new Error('REGFOX_FORM_ID is not configured');

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      // treated as a read
    }

    if (typeof body.eventId === 'string' && body.eventId) {
      // A form belongs to exactly one event; clear any previous binding.
      const { error: clearError } = await supabase
        .from('events')
        .update({ regfox_form_id: null })
        .eq('regfox_form_id', formId)
        .neq('id', body.eventId);
      if (clearError) throw new Error(clearError.message);

      const { error: bindError } = await supabase
        .from('events')
        .update({ regfox_form_id: formId })
        .eq('id', body.eventId);
      if (bindError) throw new Error(bindError.message);
    }

    const { data: events, error } = await supabase
      .from('events')
      .select('id, name, year, is_active, regfox_form_id')
      .order('year', { ascending: false });
    if (error) throw new Error(error.message);

    const bound = (events ?? []).find((e) => e.regfox_form_id === formId) ?? null;

    return new Response(
      JSON.stringify({
        success: true,
        regfox_form_id: formId,
        bound_event: bound,
        events,
        warning: bound
          ? null
          : 'This RegFox form is not linked to any event. Imports will fall back to the active event.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = (error as Error).message;
    console.error('RegFox config failed:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});