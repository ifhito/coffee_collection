import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return createErrorResponse('Not available in production', 403)
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return createErrorResponse('Email and password required in request body', 400)
    }

    console.log('=== MANUAL LOGIN TEST ===')
    console.log('Testing email:', email)
    console.log('Password length:', password.length)
    console.log('Supabase URL:', getSupabaseUrl())
    console.log('Anon Key exists:', !!getSupabaseAnonKey())

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseAnonKey()
    )

    // 詳細なログ付きでログイン試行
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), // メールを正規化
      password: password
    })

    console.log('=== LOGIN RESULT ===')
    console.log('User exists:', !!data.user)
    console.log('Session exists:', !!data.session)
    console.log('User ID:', data.user?.id)
    console.log('User email:', data.user?.email)
    console.log('Email confirmed:', data.user?.email_confirmed_at)
    console.log('User role:', data.user?.role)
    console.log('Error name:', error?.name)
    console.log('Error message:', error?.message)
    console.log('Error status:', error?.status)

    if (error) {
      return createErrorResponse(`Login failed: ${error.message}`, 401)
    }

    return createSuccessResponse({
      message: 'Manual login test successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at,
        role: data.user?.role
      },
      hasSession: !!data.session
    })
  } catch (error) {
    console.error('Manual login test error:', error)
    return createErrorResponse('Manual login test failed', 500)
  }
}
