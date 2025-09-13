import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function withAuth(
  request: NextRequest,
  handler: (userId: string, supabase: any) => Promise<NextResponse>
) {
  try {
    // Authorization ヘッダーからトークンを取得
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // ユーザートークンを使用してクライアントを作成
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

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('User validation error:', error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return await handler(user.id, supabase)
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}