import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const testEmail = 'confirmed.user@gmail.com'
    const testPassword = 'confirmed123'

    console.log('Creating confirmed user:', testEmail)

    // まず既存ユーザーがいるかチェックして削除
    try {
      const { data: signInTest } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      })

      if (signInTest.user) {
        console.log('User already exists and can login')
        return createSuccessResponse({
          message: 'User already exists and is confirmed',
          credentials: { email: testEmail, password: testPassword }
        })
      }
    } catch (e) {
      console.log('User does not exist or cannot login, creating new one')
    }

    // 新しいユーザーを作成
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    console.log('Signup result:', {
      hasUser: !!signUpData.user,
      hasSession: !!signUpData.session,
      emailConfirmed: signUpData.user?.email_confirmed_at,
      error: signUpError?.message
    })

    if (signUpError) {
      return createErrorResponse(`Signup failed: ${signUpError.message}`, 400)
    }

    // サインアップ後すぐにログインを試行（メール確認が無効な場合）
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    console.log('Immediate login test:', {
      hasUser: !!signInData.user,
      hasSession: !!signInData.session,
      error: signInError?.message
    })

    if (signInError) {
      return createErrorResponse(`User created but email confirmation required. Go to Supabase console and confirm email for: ${testEmail}`, 201)
    }

    return createSuccessResponse({
      message: 'Confirmed user created and tested successfully',
      credentials: { email: testEmail, password: testPassword },
      user: signInData.user
    })
  } catch (error) {
    console.error('Confirmed user creation error:', error)
    return createErrorResponse('Failed to create confirmed user', 500)
  }
}