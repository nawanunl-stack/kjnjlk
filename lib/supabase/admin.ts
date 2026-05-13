import { createClient } from '@supabase/supabase-js'

// ใช้เฉพาะ Server-side / API Routes เท่านั้น
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
