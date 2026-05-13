import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const jar = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n)         { return jar.get(n)?.value },
        set(n, v, o)   { try { jar.set({ name: n, value: v, ...o }) } catch {} },
        remove(n, o)   { try { jar.set({ name: n, value: '', ...o }) } catch {} },
      },
    }
  )
}
