import { createClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY      ?? ''

export const isSupabaseConfigured = !!(url && anonKey)

// Use placeholder values when env vars are absent so createClient doesn't throw at
// module-load time. All callers guard with `isSupabaseConfigured` before making requests.
const PLACEHOLDER = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder'

// Browser / server components — anon key, subject to RLS
export const supabase = createClient(
  url || PLACEHOLDER,
  anonKey || PLACEHOLDER_KEY,
)

// API routes only — bypasses RLS
export const supabaseAdmin = createClient(
  url || PLACEHOLDER,
  serviceKey || PLACEHOLDER_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
