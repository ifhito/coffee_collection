import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    console.log('Login attempt for email:', email)

    if (!email || !password) {
      console.log('Missing email or password')
      return createErrorResponse('Email and password are required', 400)
    }

    console.log('Creating Supabase client with URL:', getSupabaseUrl())

    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

    console.log('Attempting to sign in with Supabase...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('Supabase auth result:', {
      hasUser: !!data.user,
      hasSession: !!data.session,
      errorCode: error?.name,
      errorMessage: error?.message
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return createErrorResponse(error.message, 401)
    }

    console.log('Login successful for user:', data.user?.id)
    return createSuccessResponse({
      user: data.user,
      session: data.session
    })
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
