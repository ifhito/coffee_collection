import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth'
import { createAnonClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const authHeader = request.headers.get('Authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 認証されている場合は、ユーザー固有のデータを返す
      return withAuth(request, async (userId, supabase) => {
        const [
          { data: beanData, error: beanError },
          { data: originData, error: originError },
          { data: flavorData, error: flavorError },
          { data: shopsData, error: shopsError }
        ] = await Promise.all([
          supabase
            .from('bean_batches')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single(),
          supabase
            .from('bean_origins')
            .select('origin')
            .eq('bean_batch_id', id)
            .eq('user_id', userId)
            .order('ordinal', { ascending: true }),
          supabase
            .from('flavor_notes')
            .select('note')
            .eq('bean_batch_id', id)
            .eq('user_id', userId)
            .order('ordinal', { ascending: true }),
          supabase
            .from('shops')
            .select('*')
            .eq('user_id', userId)
        ])

        if (beanError) {
          if (beanError.code === 'PGRST116') {
            return createErrorResponse('Bean not found', 404)
          }
          return createErrorResponse(beanError.message)
        }

        const bean = beanData
        const origins = (originData || []).map((r: any) => r.origin)
        const flavorNotes = (flavorData || []).map((r: any) => r.note)

        let roasterShop = null
        let purchaseShop = null

        if (shopsData && !shopsError) {
          roasterShop = shopsData.find((s: any) => s.id === bean.roaster_shop_id) || null
          purchaseShop = shopsData.find((s: any) => s.id === bean.purchase_shop_id) || null
        }

        return createSuccessResponse({
          ...bean,
          origins,
          flavorNotes,
          roasterShop,
          purchaseShop
        })
      })
    } else {
      // 認証されていない場合は、公開データを返す
      let supabase
      try {
        supabase = createAnonClient()
      } catch (error) {
        console.error('Failed to create anon client for bean detail:', error)
        return createErrorResponse('Supabase anon key is not configured', 500)
      }

      const [
        { data: beanData, error: beanError },
        { data: originData, error: originError },
        { data: flavorData, error: flavorError },
        { data: shopsData, error: shopsError }
      ] = await Promise.all([
        supabase
          .from('bean_batches')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('bean_origins')
          .select('origin')
          .eq('bean_batch_id', id)
          .order('ordinal', { ascending: true }),
        supabase
          .from('flavor_notes')
          .select('note')
          .eq('bean_batch_id', id)
          .order('ordinal', { ascending: true }),
        supabase
          .from('shops')
          .select('*')
      ])

      if (beanError) {
        if (beanError.code === 'PGRST116') {
          return createErrorResponse('Bean not found', 404)
        }
        return createErrorResponse(beanError.message)
      }

      const bean = beanData
      const origins = (originData || []).map((r: any) => r.origin)
      const flavorNotes = (flavorData || []).map((r: any) => r.note)

      let roasterShop = null
      let purchaseShop = null

      if (shopsData && !shopsError) {
        roasterShop = shopsData.find((s: any) => s.id === bean.roaster_shop_id) || null
        purchaseShop = shopsData.find((s: any) => s.id === bean.purchase_shop_id) || null
      }

      return createSuccessResponse({
        ...bean,
        origins,
        flavorNotes,
        roasterShop,
        purchaseShop
      })
    }
  } catch (error) {
    console.error('Error fetching bean:', error)
    return createErrorResponse('Failed to fetch bean', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const { id } = params
      const body = await request.json()

      // 豆が存在し、ユーザーの所有であることを確認
      const { data: existingBean, error: checkError } = await supabase
        .from('bean_batches')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (checkError || !existingBean) {
        return createErrorResponse('Bean not found', 404)
      }

      const { error: updateError } = await supabase
        .from('bean_batches')
        .update(body)
        .eq('id', id)
        .eq('user_id', userId)

      if (updateError) {
        return createErrorResponse(updateError.message)
      }

      return createSuccessResponse({ message: 'Bean updated successfully' })
    } catch (error) {
      console.error('Error updating bean:', error)
      return createErrorResponse('Failed to update bean', 500)
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const { id } = params

      // 豆が存在し、ユーザーの所有であることを確認
      const { data: existingBean, error: checkError } = await supabase
        .from('bean_batches')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (checkError || !existingBean) {
        return createErrorResponse('Bean not found', 404)
      }

      // 関連データを削除
      const [
        { error: originError },
        { error: flavorError }
      ] = await Promise.all([
        supabase.from('bean_origins').delete().eq('bean_batch_id', id).eq('user_id', userId),
        supabase.from('flavor_notes').delete().eq('bean_batch_id', id).eq('user_id', userId)
      ])

      if (originError || flavorError) {
        return createErrorResponse('Failed to delete related data')
      }

      // 豆データを削除
      const { error: beanError } = await supabase
        .from('bean_batches')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (beanError) {
        return createErrorResponse(beanError.message)
      }

      return createSuccessResponse({ message: 'Bean deleted successfully' })
    } catch (error) {
      console.error('Error deleting bean:', error)
      return createErrorResponse('Failed to delete bean', 500)
    }
  })
}
