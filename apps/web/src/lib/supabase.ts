import { createClient } from '@supabase/supabase-js';

// Vite exposes VITE_ prefixed vars from apps/web/.env to the browser.
// Fallback values are provided so the app works without a .env file during development.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://keuogjmullesdwhgzgmc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldW9nam11bGxlc2R3aGd6Z21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5ODgzODIsImV4cCI6MjEwMjU2NDM4Mn0.yiPvtBlbLVuVrJCFMGrxrdWin8x3liEZZMies4Q3SeQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
