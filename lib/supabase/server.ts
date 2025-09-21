import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from '@/lib/constants'

// API Route用のクライアント（サーバーサイド）
export const createAPIClient = () => {
  // Service Role Keyを使用してRLSをバイパス
  const serviceRoleKey = getSupabaseServiceRoleKey()

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    throw new Error('Service role key is required for API routes')
  }

  return createClient(
    getSupabaseUrl(),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export const createAnonClient = () => {
  const anonKey = getSupabaseAnonKey()

  if (!anonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    throw new Error('Anon key is required for public data access')
  }

  return createClient(getSupabaseUrl(), anonKey)
}
