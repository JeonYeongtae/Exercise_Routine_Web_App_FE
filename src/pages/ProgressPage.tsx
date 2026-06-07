import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { db } from '../db/db'
import { getExercise, getLadder } from '../domain/exercises'
import { ALL_LADDERS } from '../domain/progression'
import { parseDateKey } from '../lib/date'

export default function ProgressPage() {
  const states = useLiveQuery(() => db.progress.toArray(), [])
  const sessions = useLiveQuery(
    () => db.sessions.where('completedAt').above(0).reverse().limit(10).toArray(),
    [],
  )

  if (!states) return <div className="page">불러오는 중…</div>
  const byLadder = new Map(states.map((s) => [s.ladderId, s]))

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ fontSize: 24 }}>나의 진행</h1>
        <span className="faint">{sessions?.length ? `최근 ${sessions.length}회` : ''}</span>
      </div>

      {/* 사다리별 현재 단계 */}
      {ALL_LADDERS.map((ladder) => {
        const st = byLadder.get(ladder.id)
        if (!st) return null
        const cur = getExercise(st.exerciseId)
        const idx = ladder.exerciseIds.indexOf(st.exerciseId)
        const unit = cur.kind === 'hold' ? '초' : '회'
        return (
          <div className="card" key={ladder.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 16 }}>
                <span className={`dot ${ladder.pattern}`} style={{ marginRight: 8 }} />
                {ladder.label}
              </h2>
              <span className="faint" style={{ fontSize: 12 }}>{idx + 1}/{ladder.exerciseIds.length}단계</span>
            </div>
            <div style={{ margin: '8px 0', fontSize: 15 }}>
              현재: <strong>{cur.name}</strong> · 목표 {st.targetSets}×{st.targetReps}{unit}
            </div>
            {/* 사다리 단계 시각화 */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {ladder.exerciseIds.map((id, i) => (
                <div
                  key={id}
                  title={getExercise(id).name}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 99,
                    background: i < idx ? 'var(--accent-press)' : i === idx ? 'var(--accent)' : 'var(--surface-2)',
                  }}
                />
              ))}
            </div>
            <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
              다음 단계: {ladder.exerciseIds[idx + 1] ? getExercise(ladder.exerciseIds[idx + 1]).name : '최고 단계 도달 🏆'}
            </div>
          </div>
        )
      })}

      {/* 최근 기록 */}
      <h2 style={{ fontSize: 16, margin: '20px 0 10px' }}>최근 운동</h2>
      {sessions && sessions.length > 0 ? (
        sessions.map((s) => {
          const sets = s.entries.length
          const totalReps = s.entries.reduce((n, e) => n + e.actualReps, 0)
          const ladders = new Set(s.entries.map((e) => getLadder(getExercise(e.exerciseId).ladderId).pattern))
          return (
            <div className="card" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{format(parseDateKey(s.date), 'M월 d일 (EEE)', { locale: ko })}</div>
                <div className="faint" style={{ fontSize: 13 }}>{s.routineName} · {sets}세트</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {[...ladders].map((p) => <span key={p} className={`dot ${p}`} />)}
                </div>
                <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>총 {totalReps}회</div>
              </div>
            </div>
          )
        })
      ) : (
        <p className="faint center" style={{ padding: 20 }}>아직 완료한 운동이 없어요.<br />오늘 첫 세션을 시작해보세요 💪</p>
      )}
    </div>
  )
}
