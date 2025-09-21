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

    console.log('Sending password reset for:', testEmail)

    const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: 'http://localhost:3000/login'
    })

    console.log('Password reset result:', { data, error: error?.message })

    if (error) {
      return createErrorResponse(`Password reset failed: ${error.message}`, 400)
    }

    return createSuccessResponse({
      message: 'Password reset email sent (check server logs for development)',
      data
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return createErrorResponse('Failed to send password reset', 500)
  }
}
