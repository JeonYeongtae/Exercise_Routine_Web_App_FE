import Dexie, { type EntityTable } from 'dexie'
import type { ProgressState, ProteinEntry, SessionLog } from '../domain/types'
import { initialProgress } from '../domain/progression'

// ── 로컬 저장소 (IndexedDB via Dexie) ─────────────────────────────
// 모든 데이터는 폰 안에 저장된다. 서버/인터넷 없이도 완전히 동작.

/** 단순 key-value 설정 테이블용 */
export interface Setting {
  key: string
  value: unknown
}

class HomePTDatabase extends Dexie {
  progress!: EntityTable<ProgressState, 'ladderId'>
  sessions!: EntityTable<SessionLog, 'id'>
  settings!: EntityTable<Setting, 'key'>
  protein!: EntityTable<ProteinEntry, 'id'>

  constructor() {
    super('homept')
    this.version(1).stores({
      progress: 'ladderId',
      sessions: '++id, date, completedAt',
      settings: 'key',
    })
    // v2: 단백질 섭취 기록 테이블 추가
    this.version(2).stores({
      protein: '++id, date',
    })
  }
}

export const db = new HomePTDatabase()

/** 최초 실행 시 초기 진행 상태를 심는다 (이미 있으면 건너뜀) */
export async function ensureSeeded(): Promise<void> {
  const count = await db.progress.count()
  if (count > 0) return
  await db.progress.bulkPut(initialProgress())
}

/** 진행 상태 전체 조회 */
export async function getProgressStates(): Promise<ProgressState[]> {
  return db.progress.toArray()
}

/** 완료된 세션을 저장한다 */
export async function saveSession(session: SessionLog): Promise<number> {
  return db.sessions.add(session) as Promise<number>
}

/** 특정 날짜에 완료한 세션이 있는지 */
export async function getSessionByDate(date: string): Promise<SessionLog | undefined> {
  return db.sessions.where('date').equals(date).and((s) => Boolean(s.completedAt)).first()
}

/** 설정 값 읽기 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

/** 설정 값 쓰기 */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

/** 단백질 섭취 기록 추가 */
export async function addProtein(date: string, grams: number, label: string): Promise<void> {
  await db.protein.add({ date, grams, label, at: Date.now() })
}

/** 단백질 기록 삭제 */
export async function deleteProtein(id: number): Promise<void> {
  await db.protein.delete(id)
}

/** 진행 상태를 초기 시작점으로 되돌린다 (튜닝 중 망쳤을 때) */
export async function resetProgress(): Promise<void> {
  await db.progress.clear()
  await db.progress.bulkPut(initialProgress())
}
