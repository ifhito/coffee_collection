import { NextRequest } from 'next/server'
import { withAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const { searchParams } = new URL(request.url)
      const type = searchParams.get('type')

      let query = supabase
        .from('shops')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        return createErrorResponse(error.message)
      }

      return createSuccessResponse(data)
    } catch (error) {
      console.error('Error fetching shops:', error)
      return createErrorResponse('Failed to fetch shops', 500)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, supabase) => {
    try {
      const body = await request.json()
      console.log('Shop creation request body:', body) // デバッグログ

      const { name, type, url, address, memo } = body

      if (!name?.trim() || !type) {
        console.log('Validation failed:', { name: name?.trim(), type })
        return createErrorResponse('名前と種類は必須です')
      }

      const shopData = {
        user_id: userId,
        name: name.trim(),
        type,
        url: url?.trim() || null,
        address: address?.trim() || null,
        memo: memo?.trim() || null,
      }

      console.log('Shop data to insert:', shopData) // デバッグログ

      const { data, error } = await supabase
        .from('shops')
        .insert(shopData)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return createErrorResponse(error.message)
      }

      console.log('Shop created successfully:', data) // デバッグログ
      return createSuccessResponse(data, 201)
    } catch (error) {
      console.error('Error creating shop:', error)
      return createErrorResponse('Failed to create shop', 500)
    }
  })
}