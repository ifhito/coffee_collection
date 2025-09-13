// コーヒー豆関連の定数定義

// 焙煎度の固定値リスト
export const ROAST_LEVELS = [
  "Light",
  "Cinnamon",
  "Medium",
  "High",
  "City",
  "Full City",
  "French",
  "Italian"
] as const

// 精製方法の固定値リスト
export const PROCESS_METHODS = [
  "Washed",
  "Natural",
  "Honey",
  "Semi-Washed",
  "Anaerobic",
  "Carbonic Maceration",
  "Other"
] as const

// 型定義
export type RoastLevel = typeof ROAST_LEVELS[number]
export type ProcessMethod = typeof PROCESS_METHODS[number]