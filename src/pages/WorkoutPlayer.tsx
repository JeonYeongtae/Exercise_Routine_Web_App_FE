import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getProgressStates, saveSession } from '../db/db'
import { getExercise } from '../domain/exercises'
import { applyProgression, buildDayPlan } from '../domain/progression'
import type { ProgressionResult } from '../domain/progression'
import type { SetEntry, SessionLog } from '../domain/types'
import { dateKey, fmtClock } from '../lib/date'
import { beep, speak, startBeep, tick, unlockAudio, vibrate } from '../lib/coach'
import { useWakeLock } from '../hooks/useWakeLock'

type Phase = 'intro' | 'announce' | 'work' | 'log' | 'rest' | 'done'

const RPE_OPTIONS = [
  { label: '여유 😎', sub: '더 할 수 있었음', rpe: 6 },
  { label: '적당 🙂', sub: '2~3개 더 가능', rpe: 7.5 },
  { label: '힘듦 😤', sub: '1개 정도 남음', rpe: 9 },
  { label: '한계 🥵', sub: '한 개도 못 더 함', rpe: 10 },
]

export default function WorkoutPlayer() {
  const navigate = useNavigate()
  const today = dateKey(new Date())
  const states = useLiveQuery(() => db.progress.toArray(), [])

  const [phase, setPhase] = useState<Phase>('intro')
  const [blockIdx, setBlockIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [entries, setEntries] = useState<SetEntry[]>([])
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [logReps, setLogReps] = useState(0)
  const [summary, setSummary] = useState<ProgressionResult[] | null>(null)

  const deadlineRef = useRef(0)
  const startedAtRef = useRef(Date.now())
  const finalizedRef = useRef(false)

  // 운동 중에는 화면이 꺼지지 않게 (intro/done 제외)
  useWakeLock(phase !== 'intro' && phase !== 'done')

  // 진행 상태로부터 오늘 루틴 구성
  const plan = useMemo(() => (states ? buildDayPlan(today, states) : null), [states, today])
  const blocks = plan?.blocks ?? []
  const block = blocks[blockIdx]
  const ex = block ? getExercise(block.exerciseId) : null
  const unit = block?.kind === 'hold' ? '초' : '회'

  const totalSets = blocks.reduce((n, b) => n + b.sets, 0)

  // ── 카운트다운 (휴식 / hold 운동) ────────────────────────────
  function startCountdown(sec: number) {
    deadlineRef.current = Date.now() + sec * 1000
    setSecondsLeft(sec)
  }

  const isCounting = phase === 'rest' || (phase === 'work' && block?.kind === 'hold')

  useEffect(() => {
    if (!isCounting || !block) return
    let lastShown = -1
    const id = setInterval(() => {
      const remain = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      if (remain !== lastShown) {
        lastShown = remain
        setSecondsLeft(remain)
        if (remain <= 3 && remain > 0) tick()
      }
      if (remain <= 0) {
        clearInterval(id)
        onCountdownEnd()
      }
    }, 150)
    return () => clearInterval(id)
    // onCountdownEnd는 phase/index 의존 → 의존성에 phase 포함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, blockIdx, setIdx, isCounting])

  function onCountdownEnd() {
    if (phase === 'rest') {
      startBeep()
      vibrate([120, 60, 120])
      goToWork()
    } else {
      // hold 운동 시간 종료
      startBeep()
      speak('완료')
      vibrate(200)
      openLog(block?.target ?? 0)
    }
  }

  // 새 운동(announce)에 진입하면 음성 안내
  useEffect(() => {
    if (phase === 'announce' && ex && block) {
      speak(`${ex.name}. ${block.sets}세트, 목표 ${block.target}${block.kind === 'hold' ? '초' : '회'}.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, blockIdx])

  // ── 전이 함수들 ──────────────────────────────────────────────
  function begin() {
    unlockAudio()
    startedAtRef.current = Date.now()
    setPhase('announce')
  }

  function goToWork() {
    setPhase('work')
    if (block?.kind === 'hold') {
      speak('버티세요')
      startCountdown(block.target)
    } else {
      speak('시작')
      startBeep()
    }
  }

  function openLog(reps: number) {
    setLogReps(reps)
    setPhase('log')
  }

  function enterRest(sec: number) {
    setPhase('rest')
    startCountdown(sec)
    speak(`휴식 ${sec}초`)
  }

  function confirmLog(actual: number, rpe: number) {
    if (!block) return
    const entry: SetEntry = {
      exerciseId: block.exerciseId,
      setIndex: setIdx,
      targetReps: block.target,
      actualReps: actual,
      rpe,
    }
    const next = [...entries, entry]
    setEntries(next)
    advance(next)
  }

  function advance(allEntries: SetEntry[]) {
    if (!block) return
    if (setIdx + 1 < block.sets) {
      setSetIdx(setIdx + 1)
      enterRest(block.restSec)
    } else if (blockIdx + 1 < blocks.length) {
      setBlockIdx(blockIdx + 1)
      setSetIdx(0)
      setPhase('announce')
    } else {
      void finalize(allEntries)
    }
  }

  async function finalize(allEntries: SetEntry[]) {
    if (finalizedRef.current) return
    finalizedRef.current = true
    setPhase('done')
    speak('운동 완료! 정말 잘했어요.')

    const session: SessionLog = {
      date: today,
      routineName: plan?.routineName ?? '홈 풀바디',
      startedAt: startedAtRef.current,
      completedAt: Date.now(),
      entries: allEntries,
    }
    await saveSession(session)
    // 과부하 엔진: 결과 반영해 다음 세션 처방 갱신
    const current = await getProgressStates()
    const { states: updated, results } = applyProgression(current, session)
    await db.progress.bulkPut(updated)
    setSummary(results.filter((r) => allEntries.some((e) => e.exerciseId === r.before.exerciseId)))
  }

  // ── 렌더 ─────────────────────────────────────────────────────
  if (!states || !plan) return <div className="page">불러오는 중…</div>
  if (blocks.length === 0)
    return (
      <div className="page center">
        <p>오늘 할당된 운동이 없어요.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>돌아가기</button>
      </div>
    )

  const completedSets = entries.length
  const progressPct = Math.round((completedSets / totalSets) * 100)

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '16px', paddingTop: 'calc(16px + var(--sat))' }}>
      {/* 상단: 진행바 + 나가기 */}
      {phase !== 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate('/')} style={{ fontSize: 24, color: 'var(--text-dim)' }}>✕</button>
          <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99 }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent)', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <span className="faint" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{completedSets}/{totalSets}</span>
        </div>
      )}

      {/* INTRO */}
      {phase === 'intro' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: 26 }}>{plan.routineName}</h1>
          <p className="muted" style={{ margin: '6px 0 16px' }}>오늘 {blocks.length}개 운동 · 총 {totalSets}세트</p>
          <div className="card" style={{ flex: 1 }}>
            {blocks.map((b, i) => {
              const e = getExercise(b.exerciseId)
              return (
                <div key={b.exerciseId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < blocks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span className="faint" style={{ width: 20 }}>{i + 1}</span>
                  <span className={`dot ${e.pattern}`} />
                  <span style={{ flex: 1 }}>{e.name}</span>
                  <span className="faint">{b.sets}×{b.target}{b.kind === 'hold' ? '초' : '회'}</span>
                </div>
              )
            })}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={begin}>▶ 운동 시작</button>
          <p className="faint center" style={{ fontSize: 12, marginTop: 8 }}>🔊 소리를 켜면 음성 코칭을 들을 수 있어요</p>
        </div>
      )}

      {/* ANNOUNCE: 운동 소개 + 자세 큐 */}
      {phase === 'announce' && ex && block && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="center">
            <div className="faint">{blockIdx + 1} / {blocks.length} · {setIdx + 1}세트</div>
            <h1 style={{ fontSize: 32, margin: '8px 0' }}><span className={`dot ${ex.pattern}`} style={{ width: 12, height: 12, marginRight: 8 }} />{ex.name}</h1>
            <div style={{ fontSize: 20, color: 'var(--accent)', fontWeight: 700 }}>목표 {block.target}{unit}</div>
          </div>
          <div className="card" style={{ marginTop: 24 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8, fontWeight: 700 }}>자세 포인트</div>
            {ex.cues.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--accent)' }}>✓</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 'auto' }} onClick={goToWork}>세트 시작 ▶</button>
        </div>
      )}

      {/* WORK */}
      {phase === 'work' && ex && block && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div className="faint">{setIdx + 1} / {block.sets}세트 · {ex.name}</div>
          {block.kind === 'hold' ? (
            <>
              <div style={{ fontSize: 88, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: secondsLeft <= 3 ? 'var(--warn)' : 'var(--text)' }}>
                {secondsLeft}
              </div>
              <div className="muted">초 버티기</div>
              <button className="btn btn-ghost" style={{ width: 'auto', padding: '12px 24px', marginTop: 24 }} onClick={() => openLog(block.target - secondsLeft)}>
                일찍 끝내기
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 96, fontWeight: 800, color: 'var(--accent)' }}>{block.target}</div>
              <div className="muted" style={{ marginBottom: 32 }}>회 목표 · 천천히 정확하게</div>
              <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={() => { beep(880, 120); openLog(block.target) }}>세트 완료 ✓</button>
            </>
          )}
        </div>
      )}

      {/* LOG: 실제 수행 기록 + 강도(RPE) */}
      {phase === 'log' && ex && block && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="center" style={{ fontSize: 22 }}>이번 세트 어땠나요?</h2>
          <p className="faint center" style={{ marginBottom: 20 }}>{ex.name} · {setIdx + 1}세트</p>

          {block.kind !== 'hold' && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="muted center" style={{ fontSize: 13, marginBottom: 10 }}>실제 횟수</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <button className="btn btn-ghost" style={{ width: 56, fontSize: 28, padding: 8 }} onClick={() => setLogReps((r) => Math.max(0, r - 1))}>−</button>
                <span style={{ fontSize: 40, fontWeight: 800, minWidth: 70, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{logReps}</span>
                <button className="btn btn-ghost" style={{ width: 56, fontSize: 28, padding: 8 }} onClick={() => setLogReps((r) => r + 1)}>+</button>
              </div>
            </div>
          )}

          <div className="muted center" style={{ fontSize: 13, marginBottom: 10 }}>운동 강도</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {RPE_OPTIONS.map((o) => (
              <button
                key={o.rpe}
                className="card"
                style={{ textAlign: 'center', padding: '14px 8px' }}
                onClick={() => confirmLog(logReps, o.rpe)}
              >
                <div style={{ fontWeight: 700, fontSize: 16 }}>{o.label}</div>
                <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* REST */}
      {phase === 'rest' && ex && block && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div className="muted">휴식</div>
          <div style={{ fontSize: 88, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: secondsLeft <= 3 ? 'var(--warn)' : 'var(--accent)' }}>
            {fmtClock(secondsLeft)}
          </div>
          <div className="faint">다음: {ex.name} {setIdx + 1}세트</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button className="btn btn-ghost" style={{ width: 'auto', padding: '12px 20px' }} onClick={() => startCountdown(secondsLeft + 15)}>+15초</button>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 24px' }} onClick={() => { deadlineRef.current = Date.now(); setSecondsLeft(0) }}>건너뛰기 ▶</button>
          </div>
        </div>
      )}

      {/* DONE: 요약 + 다음 처방 */}
      {phase === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="center" style={{ marginTop: 24 }}>
            <div style={{ fontSize: 64 }}>🎉</div>
            <h1 style={{ fontSize: 28 }}>운동 완료!</h1>
            <p className="muted">{entries.length}세트 · {Math.round((Date.now() - startedAtRef.current) / 60000)}분</p>
          </div>
          <div className="card" style={{ marginTop: 20 }}>
            <div className="muted" style={{ fontWeight: 700, marginBottom: 10 }}>📈 다음 세션 처방 (자동 조정)</div>
            {summary === null ? (
              <p className="faint">계산 중…</p>
            ) : (
              summary.map((r) => (
                <div key={r.ladderId} style={{ fontSize: 14, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  {r.message}
                </div>
              ))
            )}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 'auto' }} onClick={() => navigate('/')}>완료</button>
        </div>
      )}
    </div>
  )
}
