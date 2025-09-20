import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/constants'

// API Route用のクライアント（サーバーサイド）
export const createAPIClient = () => {
  // Service Role Keyを使用してRLSをバイパス
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
