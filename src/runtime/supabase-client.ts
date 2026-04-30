type CreateClientFn = (url: string, key: string, options?: Record<string, unknown>) => any;

export interface SupabaseRuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

export function assertSupabaseEnv(env: SupabaseRuntimeEnv = process.env): { url: string; key: string } {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');

  return { url, key };
}

export async function createCamelotSupabaseClient(env: SupabaseRuntimeEnv = process.env) {
  const { url, key } = assertSupabaseEnv(env);

  let createClient: CreateClientFn;
  try {
    const mod = await import('@supabase/supabase-js');
    createClient = mod.createClient;
  } catch {
    throw new Error('Missing dependency @supabase/supabase-js. Install it before using SupabaseCommandQueue.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
