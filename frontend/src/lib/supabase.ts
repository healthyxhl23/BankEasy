// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Debug: Log environment variables (remove in production!)
console.log('Supabase ENV check:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables');
  throw new Error('Missing required Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('supabaseAdmin client created successfully');
  } catch (error) {
    console.error('Error creating supabaseAdmin:', error);
  }
} else {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing - supabaseAdmin will be null');
}

export { supabaseAdmin };

// Database types
export type Profile = {
  user_id: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type PlaidItem = {
  id: string;
  user_id: string;
  access_token: string;
  item_id: string;
  created_at: string;
  updated_at: string;
};