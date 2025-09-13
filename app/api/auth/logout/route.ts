import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Authorization header missing', 401)
    }

    const token = authHeader.substring(7)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { error } = await supabase.auth.signOut()

    if (error) {
      return createErrorResponse(error.message, 400)
    }

    return createSuccessResponse({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}