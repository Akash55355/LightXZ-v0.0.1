import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vaizzleaitpwetnhvhln.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhaXp6bGVhaXRwd2V0bmh2aGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODA3NDksImV4cCI6MjEwMTc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
