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

    const testEmail = 'testuser12345@gmail.com'
    const testPassword = 'test123456'

    console.log('Creating simple test user:', testEmail)

    // 既存セッションをクリア
    await supabase.auth.signOut()

    // まずは別のメールアドレスでテスト
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    console.log('Simple signup result:', {
      hasUser: !!signUpData.user,
      hasSession: !!signUpData.session,
      userId: signUpData.user?.id,
      emailConfirmedAt: signUpData.user?.email_confirmed_at,
      error: signUpError?.message
    })

    if (signUpError) {
      // ユーザーが既に存在する場合は削除してから再作成
      if (signUpError.message.includes('already been registered')) {
        console.log('User already exists, trying to login instead...')

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })

        if (signInError) {
          return createErrorResponse(`既存ユーザーでのログインに失敗: ${signInError.message}`, 400)
        }

        return createSuccessResponse({
          message: 'Existing user logged in successfully',
          user: signInData.user,
          session: signInData.session,
          credentials: { email: testEmail, password: testPassword }
        })
      }

      return createErrorResponse(`Signup failed: ${signUpError.message}`, 400)
    }

    // サインアップ成功後、即座にログインテスト
    if (signUpData.user && !signUpData.session) {
      console.log('No session from signup, trying immediate login...')

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      console.log('Immediate login result:', {
        hasUser: !!signInData.user,
        hasSession: !!signInData.session,
        error: signInError?.message
      })
    }

    return createSuccessResponse({
      message: 'Simple test user created successfully',
      user: signUpData.user,
      session: signUpData.session,
      credentials: { email: testEmail, password: testPassword }
    })
  } catch (error) {
    console.error('Simple user creation error:', error)
    return createErrorResponse('Failed to create simple test user', 500)
  }
}
