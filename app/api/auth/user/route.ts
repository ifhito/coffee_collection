import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Getting user, headers:', Object.fromEntries(request.headers.entries()))

    // Authorization ヘッダーからトークンを取得
    const authHeader = request.headers.get('Authorization')
    console.log('Auth header:', authHeader ? 'present' : 'missing')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header, returning null user')
      return createSuccessResponse({ user: null })
    }

    const token = authHeader.substring(7)
    console.log('Token extracted:', token ? 'exists' : 'missing')

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    console.log('Supabase getUser result:', { user: !!user, error: error?.message })

    if (error || !user) {
      console.log('No user found, returning null')
      return createSuccessResponse({ user: null })
    }

    console.log('User found, returning user data')
    return createSuccessResponse({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
