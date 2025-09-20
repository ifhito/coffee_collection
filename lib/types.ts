import type { RoastLevel, ProcessMethod } from './constants'

export type UUID = string

export type Score1to10 = 1|2|3|4|5|6|7|8|9|10

export interface Shop {
  id: UUID
  user_id: UUID
  name: string
  type: 'shop'|'roaster'|'online'
  url?: string | null
  address?: string | null
  memo?: string | null
  created_at: string
  updated_at: string
}

export interface BeanBatch {
  id: UUID
  user_id: UUID
  name: string
  // Roaster information replaced with shop reference
  roaster_shop_id?: UUID | null
  roast_level?: RoastLevel | null
  roast_date?: string | null
  origin_country?: string | null
  origin_region?: string | null
  farm?: string | null
  variety?: string | null
  process?: ProcessMethod | null
  purchase_shop_id?: UUID | null
  purchase_date?: string | null
  price?: number | null
  initial_weight_g?: number | null
  current_weight_g?: number | null
  notes?: string | null
  archived: boolean
  tags?: string[] | null
  // Integrated tasting information (1:1 relationship)
  liking?: Score1to10 | null
  aroma?: Score1to10 | null
  sourness?: Score1to10 | null
  bitterness?: Score1to10 | null
  sweetness?: Score1to10 | null
  body?: Score1to10 | null
  aftertaste?: Score1to10 | null
  tasting_comment?: string | null
  tasting_photos?: string[] | null
  tasted_at?: string | null
  created_at: string
  updated_at: string
}

// Note: Brew interface removed as brews table is not needed

// Normalized flavor notes interface (proper RDB design)
export interface FlavorNote {
  id: UUID
  user_id: UUID
  bean_batch_id: UUID
  note: string
  ordinal: number
  created_at: string
}

// Bean origins interface (for blends with multiple origins)
export interface BeanOrigin {
  id: UUID
  user_id: UUID
  bean_batch_id: UUID
  origin: string
  ordinal: number
  created_at: string
}

export interface InventoryLog {
  id: UUID
  user_id: UUID
  bean_batch_id: UUID
  delta_g: number
  reason: 'brew'|'adjust'|'other'
  at: string
}
