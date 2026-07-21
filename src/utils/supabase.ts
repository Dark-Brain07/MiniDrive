import { createClient } from '@supabase/supabase-js';

// Note: These are explicitly PUBLIC keys (Anon Key), they are safe to bundle in the client.
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szpzrslbybcubezmksdw.supabase.co';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HTd6RIyR5c6qLPawWnHETQ_h7phBbKn';

/** Supabase client instance using public anonymous key */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
