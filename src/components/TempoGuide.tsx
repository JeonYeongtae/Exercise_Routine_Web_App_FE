import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tempo } from '../domain/types'
import { beep, startBeep } from '../lib/coach'

// ── 템포 가이드 (도넛 페이스 메이커) ──────────────────────────────
// 한 회(rep)를 "내려가기 → (정지) → 올라가기" 단계로 나눠, 도넛이 채워지는
// 속도에 맞춰 사용자가 이상적 페이스로 움직이도록 돕는다. 목표 횟수를 채우면
// onComplete(목표)로 자동 종료. 중간에 직접 완료도 가능.

interface Phase {
  name: string
  sec: number
  color: string
}

function buildPhases(t: Tempo): Phase[] {
  const ph: Phase[] = []
  if (t.down > 0) ph.push({ name: '내려가기', sec: t.down, color: 'var(--pull)' })
  if (t.pauseDown) ph.push({ name: '버티기', sec: t.pauseDown, color: 'var(--warn)' })
  if (t.up > 0) ph.push({ name: '올라가기', sec: t.up, color: 'var(--accent)' })
  if (t.pauseUp) ph.push({ name: '잠깐', sec: t.pauseUp, color: 'var(--warn)' })
  return ph.length ? ph : [{ name: '동작', sec: 2, color: 'var(--accent)' }]
}

interface Props {
  tempo: Tempo
  target: number
  /** 목표 도달(자동) 또는 직접 완료 시 호출. 인자는 수행한 횟수 */
  onComplete: (reps: number) => void
}

export default function TempoGuide({ tempo, target, onComplete }: Props) {
  const phases = useMemo(() => buildPhases(tempo), [tempo])
  const [view, setView] = useState({ rep: 0, phaseIdx: 0, frac: 0 })
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let rep = 0
    let pi = 0
    let start = performance.now()
    let raf = 0
    let stopped = false
    startBeep()

    function frame(now: number) {
      if (stopped) return
      const dur = phases[pi].sec * 1000
      const elapsed = now - start
      setView({ rep, phaseIdx: pi, frac: Math.min(1, elapsed / dur) })

      if (elapsed >= dur) {
        pi += 1
        start = now
        if (pi >= phases.length) {
          pi = 0
          rep += 1
          if (rep >= target) {
            stopped = true
            beep(990, 300, 0.25)
            onCompleteRef.current(target)
            return
          }
          beep(880, 120) // 1회 완료
        } else {
          beep(phases[pi].name === '올라가기' ? 760 : 520, 90) // 단계 전환
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [phases, target])

  const cur = phases[view.phaseIdx] ?? phases[0]
  const R = 56
  const STROKE = 14
  const C = 2 * Math.PI * R

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle cx={80} cy={80} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          <circle
            cx={80}
            cy={80}
            r={R}
            fill="none"
            stroke={cur.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - view.frac)}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: cur.color }}>{cur.name}</div>
          <div className="faint" style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {view.rep} / {target}회
          </div>
        </div>
      </div>
      <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={() => onComplete(view.rep)}>
        세트 완료 ✓
      </button>
      <div className="faint center" style={{ fontSize: 12 }}>도넛 속도에 맞춰 움직이세요</div>
    </div>
  )
}
