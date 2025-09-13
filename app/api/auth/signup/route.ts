import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // サインアップ機能は無効化されています
  return createErrorResponse('アカウント作成は無効化されています。Supabaseの管理画面からユーザーを作成してください。', 403)
}