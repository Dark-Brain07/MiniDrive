import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szpzrslbybcubezmksdw.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HTd6RIyR5c6qLPawWnHETQ_h7phBbKn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
