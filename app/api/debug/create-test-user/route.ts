import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // 開発環境でのみ利用可能
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseAnonKey()
    )

    const testEmail = 'hito01010101@gmail.com'
    const testPassword = 'password123'

    console.log('Creating test user:', testEmail)

    // まず既存のセッションをクリア
    await supabase.auth.signOut()

    // テストユーザーを作成
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: 'Test User'
        }
      }
    })

    console.log('SignUp result:', {
      hasUser: !!signUpData.user,
      hasSession: !!signUpData.session,
      userId: signUpData.user?.id,
      signUpError: signUpError?.message
    })

    if (signUpError) {
      // ユーザーが既に存在する場合は、ログインを試行
      if (signUpError.message.includes('already been registered')) {
        console.log('User exists, trying to sign in...')

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })

        console.log('SignIn result:', {
          hasUser: !!signInData.user,
          hasSession: !!signInData.session,
          userId: signInData.user?.id,
          signInError: signInError?.message
        })

        if (signInError) {
          return createErrorResponse(`Login failed: ${signInError.message}`, 400)
        }

        return createSuccessResponse({
          message: 'Test user logged in successfully',
          user: signInData.user,
          action: 'login'
        })
      }

      return createErrorResponse(`Signup failed: ${signUpError.message}`, 400)
    }

    return createSuccessResponse({
      message: 'Test user created successfully',
      user: signUpData.user,
      action: 'signup'
    })
  } catch (error) {
    console.error('Test user creation error:', error)
    return createErrorResponse('Failed to create test user', 500)
  }
}
