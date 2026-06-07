import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { db } from '../db/db'
import { getExercise } from '../domain/exercises'
import { buildDayPlan, isTrainingDay } from '../domain/progression'
import { dateKey, WEEKDAY_LABELS } from '../lib/date'

export default function CalendarPage() {
  const navigate = useNavigate()
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => dateKey(new Date()))

  const states = useLiveQuery(() => db.progress.toArray(), [])
  const sessions = useLiveQuery(() => db.sessions.filter((s) => Boolean(s.completedAt)).toArray(), [])

  const doneDates = useMemo(
    () => new Set((sessions ?? []).map((s) => s.date)),
    [sessions],
  )

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const selectedDate = useMemo(() => {
    const [y, m, d] = selected.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selected])

  const selectedSession = (sessions ?? []).find((s) => s.date === selected)
  const plan = states ? buildDayPlan(selected, states) : null

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ fontSize: 24 }}>{format(cursor, 'yyyy년 M월', { locale: ko })}</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" style={{ width: 44, padding: 8 }} onClick={() => setCursor((c) => addMonths(c, -1))}>
            ‹
          </button>
          <button className="btn btn-ghost" style={{ width: 44, padding: 8 }} onClick={() => setCursor((c) => addMonths(c, 1))}>
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, textAlign: 'center' }}>
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} className="faint" style={{ fontSize: 12, padding: '4px 0', color: i === 0 ? 'var(--danger)' : undefined }}>
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = dateKey(d)
          const dim = !isSameMonth(d, cursor)
          const isDone = doneDates.has(key)
          const train = isTrainingDay(d)
          const isSel = key === selected
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              style={{
                aspectRatio: '1',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: isSel ? 'var(--surface-2)' : 'transparent',
                border: isToday(d) ? '1px solid var(--accent)' : '1px solid transparent',
                opacity: dim ? 0.35 : 1,
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: isToday(d) ? 700 : 500,
              }}
            >
              <span>{d.getDate()}</span>
              <span style={{ height: 6, fontSize: 6, lineHeight: '6px' }}>
                {isDone ? '✅' : train ? <span className="dot push" style={{ width: 5, height: 5 }} /> : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className="faint center" style={{ fontSize: 11, margin: '10px 0' }}>
        <span className="dot push" style={{ width: 6, height: 6 }} /> 운동 예정일 &nbsp;·&nbsp; ✅ 완료
      </div>

      {/* 선택한 날짜 상세 */}
      <div className="card" style={{ marginTop: 8 }}>
        <h2 style={{ fontSize: 16, marginBottom: 10 }}>
          {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
        </h2>
        {selectedSession ? (
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>완료한 운동 ✅</div>
            {selectedSession.entries.map((e, i) => {
              const ex = getExercise(e.exerciseId)
              return (
                <div key={i} className="faint" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ex.name} · {e.setIndex + 1}세트</span>
                  <span>{e.actualReps}{ex.kind === 'hold' ? '초' : '회'}{e.rpe ? ` · RPE ${e.rpe}` : ''}</span>
                </div>
              )
            })}
          </div>
        ) : plan && isTrainingDay(selectedDate) ? (
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>예정된 루틴 · {plan.routineName}</div>
            {plan.blocks.map((b) => {
              const ex = getExercise(b.exerciseId)
              return (
                <div key={b.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' }}>
                  <span><span className={`dot ${ex.pattern}`} /> {ex.name}</span>
                  <span className="faint">{b.sets}×{b.target}{b.kind === 'hold' ? '초' : '회'}</span>
                </div>
              )
            })}
            {selected === dateKey(new Date()) && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/workout')}>
                ▶ 운동 시작
              </button>
            )}
          </div>
        ) : (
          <p className="faint">휴식일 💤</p>
        )}
      </div>
    </div>
  )
}
