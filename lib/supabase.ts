import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client or handle the error gracefully
    // On the server (SSR), this prevents the whole app from crashing
    return createBrowserClient('', '');
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}

