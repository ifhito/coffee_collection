import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    // 開発環境でのみ利用可能
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    // Service Role KeyがあればAdmin APIを使用
    const serviceRoleKey = getSupabaseServiceRoleKey()

    if (serviceRoleKey) {
      const supabaseAdmin = createClient(
        getSupabaseUrl(),
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const testEmail = 'hito01010101@gmail.com'
      const testPassword = 'test123456'

      console.log('Creating user with Admin API:', testEmail)

      // Admin APIでユーザーを作成（メール確認不要）
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true // メール確認を自動的に完了
      })

      console.log('Admin user creation result:', {
        hasUser: !!userData.user,
        userId: userData.user?.id,
        error: userError?.message
      })

      if (userError) {
        return createErrorResponse(`Admin user creation failed: ${userError.message}`, 400)
      }

      return createSuccessResponse({
        message: 'Test user created successfully with Admin API',
        user: userData.user,
        credentials: {
          email: testEmail,
          password: testPassword
        }
      })
    } else {
      return createErrorResponse('Service Role Key not configured', 400)
    }
  } catch (error) {
    console.error('Admin user creation error:', error)
    return createErrorResponse('Failed to create user with admin API', 500)
  }
}
