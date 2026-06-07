import { useEffect, useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, resetProgress, setSetting } from '../db/db'
import { ALL_LADDERS } from '../domain/progression'
import { getExercise, HOLD_RANGE } from '../domain/exercises'
import type { ProgressState } from '../domain/types'
import {
  disablePush,
  enablePush,
  getExistingSubscription,
  isPushSupported,
  isStandalone,
  notificationPermission,
  sendTestPush,
} from '../lib/push'

const DEFAULT_API: string = import.meta.env.VITE_PUSH_API ?? ''
const REMINDER_WEEKDAYS = [1, 2, 4, 5] // 월·화·목·금

type Msg = { kind: 'ok' | 'err' | 'info'; text: string }

const selectStyle: CSSProperties = {
  background: 'var(--surface-2)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  fontSize: 14,
  fontFamily: 'inherit',
}

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.toArray(), [])

  const [apiUrl, setApiUrl] = useState('')
  const [hour, setHour] = useState(20)
  const [minute, setMinute] = useState(0)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [loaded, setLoaded] = useState(false)

  // 저장된 설정을 최초 1회 로드
  useEffect(() => {
    if (!settings || loaded) return
    const map = new Map(settings.map((s) => [s.key, s.value]))
    setApiUrl((map.get('pushApiUrl') as string) ?? DEFAULT_API)
    setHour((map.get('reminderHour') as number) ?? 20)
    setMinute((map.get('reminderMinute') as number) ?? 0)
    setLoaded(true)
  }, [settings, loaded])

  // 기존 구독 여부 확인
  useEffect(() => {
    void getExistingSubscription().then((s) => setSubscribed(Boolean(s)))
  }, [])

  const supported = isPushSupported()
  const standalone = isStandalone()
  const permission = notificationPermission()

  async function handleEnable() {
    setBusy(true)
    setMsg(null)
    try {
      await setSetting('pushApiUrl', apiUrl)
      await setSetting('reminderHour', hour)
      await setSetting('reminderMinute', minute)
      await enablePush({ apiUrl, hour, minute, weekdays: REMINDER_WEEKDAYS })
      setSubscribed(true)
      setMsg({
        kind: 'ok',
        text: `월·화·목·금 ${hour}:${String(minute).padStart(2, '0')}에 알림이 설정됐어요.`,
      })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '알림 설정에 실패했어요.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    setMsg(null)
    try {
      await disablePush(apiUrl)
      setSubscribed(false)
      setMsg({ kind: 'info', text: '알림을 껐어요.' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '알림 해제에 실패했어요.' })
    } finally {
      setBusy(false)
    }
  }

  async function handleTest() {
    setBusy(true)
    setMsg(null)
    try {
      await sendTestPush(apiUrl)
      setMsg({ kind: 'ok', text: '테스트 알림을 보냈어요. 잠시 후 확인해보세요!' })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '테스트 발송에 실패했어요.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ fontSize: 24 }}>설정</h1>
      </div>

      {/* ── 운동 알림 ─────────────────────────────── */}
      <h2 style={{ fontSize: 16, margin: '4px 0 10px' }}>🔔 운동 알림</h2>
      <div className="card">
        {!supported ? (
          <p className="muted" style={{ fontSize: 14 }}>
            이 브라우저는 푸시 알림을 지원하지 않아요.
          </p>
        ) : (
          <>
            {!standalone && (
              <div
                className="card"
                style={{ background: 'var(--surface-2)', marginBottom: 12, fontSize: 13 }}
              >
                📱 <strong>아이폰은 홈 화면에 설치한 뒤</strong>에만 알림이 동작해요. Safari 공유 →
                "홈 화면에 추가" 후 설치된 앱에서 켜주세요.
              </div>
            )}

            <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
              알림 서버 주소
            </label>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://your-be.onrender.com"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{ ...selectStyle, width: '100%', marginBottom: 14 }}
            />

            <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
              알림 시간 (운동일: 월·화·목·금)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))} style={selectStyle}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}시
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                style={selectStyle}
              >
                {[0, 10, 15, 20, 30, 40, 45, 50].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}분
                  </option>
                ))}
              </select>
              {subscribed && (
                <span className="faint" style={{ fontSize: 12 }}>· 켜짐 ✅</span>
              )}
            </div>

            {permission === 'denied' && (
              <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
                알림 권한이 차단돼 있어요. 브라우저/기기 설정에서 이 사이트의 알림을 허용해주세요.
              </p>
            )}

            <button className="btn btn-primary" onClick={handleEnable} disabled={busy}>
              {subscribed ? '알림 시간 저장' : '알림 켜기'}
            </button>
            {subscribed && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost" onClick={handleTest} disabled={busy}>
                  테스트 알림
                </button>
                <button className="btn btn-danger" onClick={handleDisable} disabled={busy}>
                  알림 끄기
                </button>
              </div>
            )}

            {msg && (
              <p
                style={{
                  fontSize: 13,
                  marginTop: 12,
                  color:
                    msg.kind === 'ok'
                      ? 'var(--accent)'
                      : msg.kind === 'err'
                        ? 'var(--danger)'
                        : 'var(--text-dim)',
                }}
              >
                {msg.text}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── 시작점 조정 ───────────────────────────── */}
      <h2 style={{ fontSize: 16, margin: '24px 0 10px' }}>🎚️ 운동 시작점 조정</h2>
      <p className="faint" style={{ fontSize: 12, marginBottom: 10 }}>
        직접 해보고 너무 쉽거나 어려우면 변형·세트·목표를 바꿔보세요. 이후엔 과부하 엔진이 자동으로
        이어갑니다.
      </p>
      <StartPointTuner />

      <button
        className="btn btn-danger"
        style={{ marginTop: 14 }}
        onClick={() => {
          if (confirm('시작점을 처음 기본값으로 되돌릴까요? 현재 진행 단계가 초기화됩니다.')) {
            void resetProgress()
          }
        }}
      >
        시작점 기본값으로 초기화
      </button>
    </div>
  )
}

// ── 사다리별 시작점 편집기 ───────────────────────────────────────
function StartPointTuner() {
  const states = useLiveQuery(() => db.progress.toArray(), [])
  if (!states) return null
  const byLadder = new Map(states.map((s) => [s.ladderId, s]))

  async function update(st: ProgressState, patch: Partial<ProgressState>) {
    await db.progress.put({ ...st, ...patch, updatedAt: Date.now() })
  }

  return (
    <>
      {ALL_LADDERS.map((ladder) => {
        const st = byLadder.get(ladder.id)
        if (!st) return null
        const cur = getExercise(st.exerciseId)
        const unit = cur.kind === 'hold' ? '초' : '회'
        const step = cur.kind === 'hold' ? 5 : 1

        return (
          <div className="card" key={ladder.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className={`dot ${ladder.pattern}`} />
              <strong style={{ fontSize: 15 }}>{ladder.label}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="muted" style={{ fontSize: 14 }}>변형</span>
              <select
                value={st.exerciseId}
                style={selectStyle}
                onChange={(e) => {
                  const nextEx = getExercise(e.target.value)
                  const min =
                    nextEx.kind === 'hold' ? (HOLD_RANGE[ladder.id]?.[0] ?? 15) : ladder.repRange[0]
                  void update(st, { exerciseId: e.target.value, targetReps: min })
                }}
              >
                {ladder.exerciseIds.map((id) => (
                  <option key={id} value={id}>
                    {getExercise(id).name}
                  </option>
                ))}
              </select>
            </div>

            <Stepper
              label="세트"
              value={st.targetSets}
              step={1}
              min={1}
              onChange={(v) => void update(st, { targetSets: v })}
            />
            <Stepper
              label={`세트당 목표 (${unit})`}
              value={st.targetReps}
              step={step}
              min={step}
              onChange={(v) => void update(st, { targetReps: v })}
            />
          </div>
        )
      })}
    </>
  )
}

function Stepper({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string
  value: number
  step: number
  min: number
  onChange: (v: number) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
      }}
    >
      <span className="muted" style={{ fontSize: 14 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="btn btn-ghost"
          style={{ width: 40, padding: 6, fontSize: 20 }}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <span
          style={{ minWidth: 44, textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        <button
          className="btn btn-ghost"
          style={{ width: 40, padding: 6, fontSize: 20 }}
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
    </div>
  )
}
