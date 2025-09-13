import { createClient } from '@supabase/supabase-js'

// API Route用のクライアント（サーバーサイド）
export const createAPIClient = () => {
  // Service Role Keyを使用してRLSをバイパス
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    throw new Error('Service role key is required for API routes')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}