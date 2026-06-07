import { format } from 'date-fns'

/** Date → 'yyyy-MM-dd' (로컬 기준 날짜 키) */
export function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/** 'yyyy-MM-dd' 문자열 → Date (로컬 자정) */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

/** mm:ss 포맷 */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
