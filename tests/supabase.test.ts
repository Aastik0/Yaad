import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isSupabaseConfigured,
  getSupabaseBrowserClient,
} from '../src/lib/supabase/client.ts';
import {
  getSupabaseServerClient,
  getSupabaseAdminClient,
} from '../src/lib/supabase/server.ts';

describe('Supabase Client Utilities (Phase 10)', () => {
  it('identifies unconfigured / demo mode gracefully without throwing', () => {
    // In test environment without real live credentials, isSupabaseConfigured should be false
    const configured = isSupabaseConfigured();
    assert.strictEqual(typeof configured, 'boolean');
  });

  it('browser client returns null in unconfigured/SSR environment without crashing', () => {
    const client = getSupabaseBrowserClient();
    // In Node.js environment (typeof window === 'undefined') or unconfigured env, returns null
    assert.strictEqual(client, null);
  });

  it('server client returns null when placeholder/empty credentials are provided', () => {
    const serverClient = getSupabaseServerClient();
    assert.strictEqual(serverClient, null);
  });

  it('admin client returns null when SUPABASE_SERVICE_ROLE_KEY is absent', () => {
    const adminClient = getSupabaseAdminClient();
    assert.strictEqual(adminClient, null);
  });
});
