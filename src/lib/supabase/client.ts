/**
 * Supabase Browser Client Utility
 * Handles client-side Supabase interactions using the public/publishable key.
 *
 * SAFETY GUARANTEES:
 * 1. NEVER references or exposes the SUPABASE_SERVICE_ROLE_KEY.
 * 2. Provides graceful fallback when environment variables are not configured,
 *    allowing Yaad to continue running seamlessly in demo/localStorage mode.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let browserClientInstance: SupabaseClient<Database> | null = null;

/**
 * Returns true if the public Supabase environment variables are present and non-empty.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    !key.includes('your-supabase-publishable')
  );
}

/**
 * Gets or initializes the browser Supabase client singleton.
 * Returns `null` if credentials are not configured, preserving demo mode functionality.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined') {
    // Prevent inadvertent browser client invocation during SSR/prerender without env
    return null;
  }

  if (browserClientInstance) {
    return browserClientInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('your-project-id') || key.includes('your-supabase-publishable')) {
    return null;
  }

  browserClientInstance = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClientInstance;
}

