/**
 * Supabase Server Client Utility
 * Server-only helper for API routes and server handlers.
 *
 * SAFETY GUARANTEES:
 * 1. Runtime guard prevents execution in browser contexts.
 * 2. Service role key is restricted strictly to getSupabaseAdminClient.
 * 3. Gracefully returns null if server environment variables are unset.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

function assertServerEnvironment(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Security Exception: Supabase server module cannot be imported or executed in the browser context.'
    );
  }
}

/**
 * Creates a server-side Supabase client respecting Row Level Security (RLS).
 * If a user JWT token is passed, it attaches the Authorization header so all queries
 * run in the context of auth.uid().
 */
export function getSupabaseServerClient(
  accessToken?: string
): SupabaseClient<Database> | null {
  assertServerEnvironment();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes('your-project-id') || key.includes('your-supabase-publishable')) {
    return null;
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  });
}

/**
 * Creates an admin Supabase client using the SUPABASE_SERVICE_ROLE_KEY.
 * Bypasses RLS - use ONLY for backend maintenance, automated ledgers, or privileged operations.
 * NEVER expose this or its output to client bundles or browser responses.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  assertServerEnvironment();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || url.includes('your-project-id') || !serviceRoleKey.trim()) {
    return null;
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

