import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // 開発環境でのみ利用可能
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseAnonKey()
    )

    // データベースから直接ユーザー情報を確認
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10)

    console.log('Profiles in database:', profiles)

    // 認証テーブルから直接確認はできないが、bean_batchesテーブルでuser_idを確認
    const { data: beans, error: beansError } = await supabase
      .from('bean_batches')
      .select('user_id')
      .limit(10)

    console.log('User IDs in bean_batches:', beans?.map(b => b.user_id))

    return createSuccessResponse({
      profiles: profiles || [],
      userIds: beans?.map(b => b.user_id) || [],
      profileError: profileError?.message,
      beansError: beansError?.message
    })
  } catch (error) {
    console.error('Debug error:', error)
    return createErrorResponse('Debug failed', 500)
  }
}
