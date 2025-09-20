import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived')
    const limit = parseInt(searchParams.get('limit') || '100')

    // 認証ヘッダーをチェック
    const authHeader = request.headers.get('Authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 認証されている場合は、ユーザー固有のデータを返す
      return withAuth(request, async (userId, supabase) => {
        let query = supabase
          .from('bean_batches')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(limit)

        if (archived !== null) {
          query = query.eq('archived', archived === 'true')
        }

        const { data, error } = await query

        if (error) {
          return createErrorResponse(error.message)
        }

        return createSuccessResponse(data)
      })
    } else {
      // 認証されていない場合は、公開データを返す（visualization用）
      const supabase = createClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

      let query = supabase
        .from('bean_batches')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (archived !== null) {
        query = query.eq('archived', archived === 'true')
      }

      const { data, error } = await query

      if (error) {
        return createErrorResponse(error.message)
      }

      return createSuccessResponse(data)
    }
  } catch (error) {
    console.error('Error fetching beans:', error)
    return createErrorResponse('Failed to fetch beans', 500)
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const body = await request.json()
      const {
        name,
        roaster_shop_id,
        roast_level,
        roast_date,
        initial_weight_g,
        farm,
        variety,
        process,
        purchase_shop_id,
        notes,
        origins
      } = body

      if (!name?.trim()) {
        return createErrorResponse('名称は必須です')
      }

      const beanData = {
        user_id: userId,
        name: name.trim(),
        roaster_shop_id: roaster_shop_id || null,
        roast_level: roast_level?.trim() || null,
        roast_date: roast_date || null,
        initial_weight_g: initial_weight_g ? Number(initial_weight_g) : null,
        current_weight_g: initial_weight_g ? Number(initial_weight_g) : null,
        farm: farm?.trim() || null,
        variety: variety?.trim() || null,
        process: process?.trim() || null,
        purchase_shop_id: purchase_shop_id || null,
        notes: notes?.trim() || null,
      }

      const { data: insertedBean, error: beanError } = await supabase
        .from('bean_batches')
        .insert(beanData)
        .select('id')
        .single()

      if (beanError) {
        return createErrorResponse(beanError.message)
      }

      // 産地データを挿入
      if (origins && Array.isArray(origins) && origins.length > 0) {
        const originData = origins.map((origin: string, index: number) => ({
          user_id: userId,
          bean_batch_id: insertedBean.id,
          origin,
          ordinal: index
        }))

        const { error: originError } = await supabase
          .from('bean_origins')
          .insert(originData)

        if (originError) {
          // 豆データを削除してロールバック
          await supabase.from('bean_batches').delete().eq('id', insertedBean.id)
          return createErrorResponse(originError.message)
        }
      }

      return createSuccessResponse({ id: insertedBean.id }, 201)
    } catch (error) {
      console.error('Error creating bean:', error)
      return createErrorResponse('Failed to create bean', 500)
    }
  })
}
