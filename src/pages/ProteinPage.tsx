import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { addProtein, db, deleteProtein, setSetting } from '../db/db'
import {
  DEFAULT_PROTEIN_FACTOR,
  DEFAULT_WEIGHT_KG,
  PROTEIN_FACTORS,
  PROTEIN_PRESETS,
  proteinGoal,
} from '../domain/nutrition'
import { dateKey } from '../lib/date'

export default function ProteinPage() {
  const today = dateKey(new Date())
  const settings = useLiveQuery(() => db.settings.toArray(), [])
  const entries = useLiveQuery(
    () => db.protein.where('date').equals(today).reverse().sortBy('at'),
    [today],
  )

  const [weight, setWeight] = useState(DEFAULT_WEIGHT_KG)
  const [factor, setFactor] = useState(DEFAULT_PROTEIN_FACTOR)
  const [loaded, setLoaded] = useState(false)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (!settings || loaded) return
    const map = new Map(settings.map((s) => [s.key, s.value]))
    setWeight((map.get('bodyWeightKg') as number) ?? DEFAULT_WEIGHT_KG)
    setFactor((map.get('proteinFactor') as number) ?? DEFAULT_PROTEIN_FACTOR)
    setLoaded(true)
  }, [settings, loaded])

  const goal = proteinGoal(weight, factor)
  const total = (entries ?? []).reduce((n, e) => n + e.grams, 0)
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0
  const remaining = Math.max(0, goal - total)
  const reached = total >= goal && goal > 0

  async function saveWeight(w: number) {
    const clamped = Math.max(30, Math.min(200, w))
    setWeight(clamped)
    await setSetting('bodyWeightKg', clamped)
  }
  async function saveFactor(f: number) {
    setFactor(f)
    await setSetting('proteinFactor', f)
  }
  function addCustom() {
    const g = parseInt(custom, 10)
    if (!Number.isFinite(g) || g <= 0) return
    void addProtein(today, g, '직접 입력')
    setCustom('')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="sub">{format(new Date(), 'M월 d일 EEEE', { locale: ko })}</div>
          <h1 style={{ fontSize: 24 }}>단백질</h1>
        </div>
      </div>

      {/* ── 오늘 목표 대비 섭취 ─────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)' }}>{total}</span>
            <span className="muted" style={{ fontSize: 16 }}> / {goal} g</span>
          </div>
          <span className="faint" style={{ fontSize: 13 }}>
            {reached ? '목표 달성 🎉' : `${remaining}g 남음`}
          </span>
        </div>
        <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 99, marginTop: 12 }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: reached ? 'var(--accent-press)' : 'var(--accent)',
              borderRadius: 99,
              transition: 'width .3s',
            }}
          />
        </div>
        <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>
          체중 {weight}kg × {factor} g/kg 기준
        </div>
      </div>

      {/* ── 빠른 추가 ───────────────────────────────── */}
      <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>빠른 추가</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PROTEIN_PRESETS.map((p) => (
          <button
            key={p.label}
            className="card"
            style={{ textAlign: 'left', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => void addProtein(today, p.grams, p.label)}
          >
            <span style={{ fontSize: 14 }}>{p.label}</span>
            <span className="faint" style={{ fontSize: 13 }}>+{p.grams}g</span>
          </button>
        ))}
      </div>

      {/* 직접 입력 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addCustom()
          }}
          placeholder="직접 입력 (g)"
          inputMode="numeric"
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: 15,
            fontFamily: 'inherit',
          }}
        />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0 22px' }} onClick={addCustom}>
          추가
        </button>
      </div>

      {/* ── 오늘 기록 ───────────────────────────────── */}
      <h2 style={{ fontSize: 15, margin: '22px 0 10px' }}>오늘 먹은 것</h2>
      {entries && entries.length > 0 ? (
        entries.map((e) => (
          <div
            key={e.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</div>
              <div className="faint" style={{ fontSize: 12 }}>{format(e.at, 'HH:mm')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{e.grams}g</span>
              <button
                aria-label="삭제"
                style={{ color: 'var(--text-faint)', fontSize: 20, padding: '0 4px' }}
                onClick={() => e.id !== undefined && void deleteProtein(e.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="faint center" style={{ padding: 16 }}>아직 기록이 없어요. 위에서 추가해보세요 🥤</p>
      )}

      {/* ── 목표 설정 ───────────────────────────────── */}
      <h2 style={{ fontSize: 15, margin: '24px 0 10px' }}>목표 설정</h2>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="muted" style={{ fontSize: 14 }}>체중</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-ghost" style={{ width: 40, padding: 6, fontSize: 20 }} onClick={() => void saveWeight(weight - 1)}>−</button>
            <span style={{ minWidth: 60, textAlign: 'center', fontWeight: 700 }}>{weight}kg</span>
            <button className="btn btn-ghost" style={{ width: 40, padding: 6, fontSize: 20 }} onClick={() => void saveWeight(weight + 1)}>+</button>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 14, margin: '16px 0 8px' }}>목표 강도</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {PROTEIN_FACTORS.map((f) => {
            const active = Math.abs(f.value - factor) < 0.001
            return (
              <button
                key={f.value}
                onClick={() => void saveFactor(f.value)}
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '10px 6px',
                  borderColor: active ? 'var(--accent)' : 'var(--border)',
                  background: active ? 'var(--surface-2)' : 'var(--surface)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: active ? 'var(--accent)' : 'var(--text)' }}>{f.label}</div>
                <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{f.value} g/kg</div>
              </button>
            )
          })}
        </div>
        <div className="faint" style={{ fontSize: 12, marginTop: 10 }}>
          → 하루 목표 <strong style={{ color: 'var(--text)' }}>{goal}g</strong> ({PROTEIN_FACTORS.find((f) => Math.abs(f.value - factor) < 0.001)?.hint ?? '사용자 설정'})
        </div>
      </div>
    </div>
  )
}
