import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const body = await request.json()
      const {
        bean_batch_id,
        liking,
        aroma,
        sourness,
        bitterness,
        sweetness,
        body: bodyScore,
        aftertaste,
        comment,
        flavorNotes
      } = body

      if (!bean_batch_id) {
        return createErrorResponse('豆を選択してください')
      }

      // 豆が存在し、ユーザーの所有であることを確認
      const { data: existingBean, error: checkError } = await supabase
        .from('bean_batches')
        .select('id')
        .eq('id', bean_batch_id)
        .eq('user_id', userId)
        .single()

      if (checkError || !existingBean) {
        return createErrorResponse('Bean not found', 404)
      }

      const updateData = {
        liking: Number(liking),
        aroma: Number(aroma),
        sourness: Number(sourness),
        bitterness: Number(bitterness),
        sweetness: Number(sweetness),
        body: Number(bodyScore),
        aftertaste: Number(aftertaste),
        tasting_comment: comment || null,
        tasted_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('bean_batches')
        .update(updateData)
        .eq('id', bean_batch_id)
        .eq('user_id', userId)

      if (updateError) {
        return createErrorResponse(updateError.message)
      }

      // フレーバーノートを更新
      if (flavorNotes && Array.isArray(flavorNotes)) {
        // 既存のフレーバーノートを削除
        await supabase
          .from('flavor_notes')
          .delete()
          .eq('bean_batch_id', bean_batch_id)
          .eq('user_id', userId)

        // 新しいフレーバーノートを挿入
        if (flavorNotes.length > 0) {
          const flavorNotesData = flavorNotes.map((note: string, index: number) => ({
            user_id: userId,
            bean_batch_id,
            note,
            ordinal: index
          }))

          const { error: flavorError } = await supabase
            .from('flavor_notes')
            .insert(flavorNotesData)

          if (flavorError) {
            return createErrorResponse(flavorError.message)
          }
        }
      }

      return createSuccessResponse({ message: 'Tasting saved successfully' })
    } catch (error) {
      console.error('Error saving tasting:', error)
      return createErrorResponse('Failed to save tasting', 500)
    }
  })
}