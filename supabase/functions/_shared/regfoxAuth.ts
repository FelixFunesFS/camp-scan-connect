import { createClient } from 'npm:@supabase/supabase-js@2';

export async function requireAdmin(req: Request): Promise<void> {
  const authorization = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && authorization === `Bearer ${serviceKey}`) return;

  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('UNAUTHORIZED');

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) throw new Error('UNAUTHORIZED');

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  );
  const { data: staff } = await serviceClient
    .from('staff')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .eq('role', 'admin')
    .maybeSingle();
  if (!staff) throw new Error('FORBIDDEN');
}

export function authErrorResponse(error: unknown, headers: Record<string, string>): Response | null {
  const message = (error as Error).message;
  if (message !== 'UNAUTHORIZED' && message !== 'FORBIDDEN') return null;
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: message === 'UNAUTHORIZED' ? 401 : 403,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}