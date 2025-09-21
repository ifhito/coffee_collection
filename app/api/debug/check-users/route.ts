import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseAnonKey()
    )

    // 直接SQLでユーザーテーブルを確認（auth.usersは通常アクセスできないため、profilesやbean_batchesから推測）
    const { data: beanUsers, error: beanError } = await supabase
      .from('bean_batches')
      .select('user_id')
      .limit(10)

    const uniqueUserIds = [...new Set(beanUsers?.map(b => b.user_id) || [])]

    console.log('Found user IDs in bean_batches:', uniqueUserIds)

    return createSuccessResponse({
      message: 'User check completed',
      userIds: uniqueUserIds,
      beanError: beanError?.message,
      supabaseUrl: getSupabaseUrl(),
      hasAnonKey: !!getSupabaseAnonKey()
    })
  } catch (error) {
    console.error('User check error:', error)
    return createErrorResponse('Failed to check users', 500)
  }
}
