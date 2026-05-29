import { createClient } from '@supabase/supabase-js';
import { getPublicEnv } from '../env';

const supabaseUrl = getPublicEnv('VITE_SUPABASE_URL');
const supabasePublicKey =
  getPublicEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getPublicEnv('VITE_SUPABASE_ANON_KEY');

export const supabaseClient =
  supabaseUrl && supabasePublicKey
  ? createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseAuthConfigured = Boolean(supabaseClient);
