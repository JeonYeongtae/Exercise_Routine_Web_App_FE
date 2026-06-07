import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getExercise } from '../domain/exercises'
import { buildDayPlan, isTrainingDay } from '../domain/progression'
import type { RoutineBlock } from '../domain/types'
import { dateKey, WEEKDAY_LABELS } from '../lib/date'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

function BlockRow({ block }: { block: RoutineBlock }) {
  const ex = getExercise(block.exerciseId)
  const unit = block.kind === 'hold' ? '초' : '회'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <span className={`dot ${ex.pattern}`} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{ex.name}</div>
        <div className="faint" style={{ fontSize: 13 }}>
          {ex.cues[0]}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ fontWeight: 700 }}>
          {block.sets} × {block.target}
          {unit}
        </div>
        <div className="faint" style={{ fontSize: 12 }}>휴식 {block.restSec}초</div>
      </div>
    </div>
  )
}

export default function TodayPage() {
  const navigate = useNavigate()
  const today = new Date()
  const key = dateKey(today)

  const states = useLiveQuery(() => db.progress.toArray(), [])
  const session = useLiveQuery(
    () => db.sessions.where('date').equals(key).filter((s) => Boolean(s.completedAt)).first(),
    [key],
  )

  if (!states) return <div className="page">불러오는 중…</div>

  const plan = buildDayPlan(key, states)
  const training = isTrainingDay(today)
  const done = Boolean(session)

  const totalSets = plan.blocks.reduce((n, b) => n + b.sets, 0)
  // 세트당 약 40초 운동 + 평균 휴식으로 대략적인 소요 시간 추정
  const avgRest = plan.blocks.length
    ? plan.blocks.reduce((n, b) => n + b.restSec, 0) / plan.blocks.length
    : 90
  const estMin = Math.round((totalSets * (40 + avgRest)) / 60)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="sub">{format(today, 'M월 d일 EEEE', { locale: ko })}</div>
          <h1 style={{ fontSize: 28 }}>오늘의 운동</h1>
        </div>
        <span className="faint">{WEEKDAY_LABELS[today.getDay()]}</span>
      </div>

      {done ? (
        <div className="card center" style={{ padding: 28 }}>
          <div style={{ fontSize: 44 }}>✅</div>
          <h2 style={{ margin: '8px 0' }}>오늘 운동 완료!</h2>
          <p className="muted">
            {session?.entries.length}세트 기록됨 · 다음 세션 난이도가 자동으로 조정됐어요.
          </p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/progress')}
          >
            진행 상황 보기
          </button>
        </div>
      ) : (
        <>
          {!training && (
            <div
              className="card"
              style={{ marginBottom: 12, borderColor: 'var(--warn)', color: 'var(--warn)' }}
            >
              💤 오늘은 휴식일이에요. 회복도 운동의 일부! 그래도 하고 싶다면 아래에서 시작할 수 있어요.
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 18 }}>{plan.routineName}</h2>
              <span className="faint">~{estMin}분 · {totalSets}세트</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 8 }}>
              {plan.blocks.map((b) => (
                <BlockRow key={b.exerciseId} block={b} />
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/workout')}
          >
            ▶ 운동 시작
          </button>
          <p className="faint center" style={{ fontSize: 12, marginTop: 10 }}>
            세트마다 음성으로 안내하고 휴식 타이머를 같이 세어줘요.
          </p>
        </>
      )}
    </div>
  )
}
