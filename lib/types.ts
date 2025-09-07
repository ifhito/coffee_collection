export type UUID = string

export type Score1to5 = 1|2|3|4|5

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
  roaster?: string | null
  roast_level?: string | null
  roast_date?: string | null
  origin_country?: string | null
  origin_region?: string | null
  farm?: string | null
  variety?: string | null
  process?: string | null
  purchase_shop_id?: UUID | null
  purchase_date?: string | null
  price?: number | null
  initial_weight_g?: number | null
  current_weight_g?: number | null
  notes?: string | null
  archived: boolean
  tags?: string[] | null
  created_at: string
  updated_at: string
}

export interface Brew {
  id: UUID
  user_id: UUID
  bean_batch_id: UUID
  method: string
  dose_g?: number | null
  grind?: string | null
  water_g?: number | null
  temperature_c?: number | null
  time_sec?: number | null
  agitation?: string | null
  equipment?: string[] | null
  date: string
  created_at: string
}

export interface Tasting {
  id: UUID
  user_id: UUID
  brew_id: UUID
  liking: Score1to5
  aroma: Score1to5
  sourness: Score1to5
  bitterness: Score1to5
  sweetness?: Score1to5 | null
  body?: Score1to5 | null
  aftertaste?: Score1to5 | null
  flavor_notes?: string[] | null
  comment?: string | null
  photos?: string[] | null
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

