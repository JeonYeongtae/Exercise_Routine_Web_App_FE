// ── 단백질 목표 계산 ──────────────────────────────────────────────
// 체중(kg)과 목표 계수(g/kg)로 하루 권장 단백질량을 계산한다.

export interface ProteinFactor {
  label: string
  value: number
  hint: string
}

/** 목표별 g/kg 계수 (근성장 구간은 보통 1.6~2.2 g/kg) */
export const PROTEIN_FACTORS: ProteinFactor[] = [
  { label: '유지', value: 1.2, hint: '일반 활동량 유지' },
  { label: '근성장', value: 1.6, hint: '근비대 권장' },
  { label: '적극 증량', value: 2.0, hint: '감량 중 근육 보존·강한 자극' },
]

export const DEFAULT_WEIGHT_KG = 70
export const DEFAULT_PROTEIN_FACTOR = 1.6

/** 하루 목표 단백질량(g) */
export function proteinGoal(weightKg: number, factor: number): number {
  return Math.round(weightKg * factor)
}

/** 자주 먹는 단백질 식품 빠른 추가 프리셋 (대략값) */
export const PROTEIN_PRESETS: { label: string; grams: number }[] = [
  { label: '🍗 닭가슴살 100g', grams: 23 },
  { label: '🥚 계란 1개', grams: 6 },
  { label: '🥛 프로틴 1스쿱', grams: 25 },
  { label: '🍶 그릭요거트', grams: 10 },
  { label: '🥩 소고기 100g', grams: 26 },
  { label: '🐟 참치캔 1개', grams: 14 },
]
