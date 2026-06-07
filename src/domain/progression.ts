import type { DayPlan, ProgressState, RoutineBlock, SessionLog } from './types'
import { getExercise, getLadder, HOLD_RANGE, LADDERS } from './exercises'

// ── 과부하(progressive overload) 엔진 ──────────────────────────────
//
// "이중 진행(double progression)" 원칙:
//   1) 정해진 목표 횟수를 모든 세트에서 달성하면 → 목표를 한 단계 올린다.
//   2) 목표가 반복 범위 최댓값에 도달하면 → 같은 사다리의 더 어려운 변형으로 넘어가고,
//      목표를 범위 최솟값으로 리셋한다.
//   3) 못 채우면 그대로 유지(맨몸 운동은 무리한 디로드보다 반복 숙달이 우선).
//
// 이렇게 하면 "개수만 무한히 늘리는" 정체 패턴 대신,
// 근비대 구간(보통 6~12회)을 유지하며 난이도를 올리게 된다.

/** reps는 1회씩, hold(버티기)는 5초씩 증가 */
function stepFor(kind: 'reps' | 'hold'): number {
  return kind === 'reps' ? 1 : 5
}

/** 해당 운동의 목표 범위 [min, max]를 돌려준다 (reps면 사다리 repRange, hold면 HOLD_RANGE) */
function rangeFor(ladderId: string, exerciseId: string): [number, number] {
  const ex = getExercise(exerciseId)
  if (ex.kind === 'hold') return HOLD_RANGE[ladderId] ?? [15, 45]
  return getLadder(ladderId).repRange
}

/** 사용자 초기 진행 상태. 정체기 탈출을 위해 "개수↓ 난이도↑"로 출발점을 잡았다. */
export function initialProgress(now = Date.now()): ProgressState[] {
  return [
    // 푸시업: 이미 25개씩 가능 → 디클라인으로 올려 8~12 근비대 구간에서 시작
    { ladderId: 'push', exerciseId: 'pushup-decline', targetSets: 4, targetReps: 10, updatedAt: now },
    // 딥스: 안전하게 벤치 딥스부터 평가하며 시작
    { ladderId: 'dip', exerciseId: 'dip-bench', targetSets: 3, targetReps: 10, updatedAt: now },
    // 당기기: 그립·광배 적응을 위해 데드행(버티기) 20초부터
    { ladderId: 'pull', exerciseId: 'deadhang', targetSets: 3, targetReps: 20, updatedAt: now },
    // 코어: 행잉 니레이즈 10회
    { ladderId: 'core', exerciseId: 'knee-raise-hang', targetSets: 3, targetReps: 10, updatedAt: now },
  ]
}

/** 진행 상태들로부터 특정 날짜의 하루 루틴을 만든다 */
export function buildDayPlan(
  date: string,
  states: ProgressState[],
  routineName = '홈 풀바디',
): DayPlan {
  // 길항근 교대(밀기↔당기기)가 자연스럽도록 정렬
  const order = ['push', 'pull', 'dip', 'core']
  const byLadder = new Map(states.map((s) => [s.ladderId, s]))

  const blocks: RoutineBlock[] = order
    .map((ladderId) => byLadder.get(ladderId))
    .filter((s): s is ProgressState => Boolean(s))
    .map((s) => {
      const ex = getExercise(s.exerciseId)
      return {
        exerciseId: s.exerciseId,
        ladderId: s.ladderId,
        sets: s.targetSets,
        target: s.targetReps,
        kind: ex.kind,
        restSec: ex.kind === 'hold' ? 60 : 90,
      }
    })

  return { date, routineId: 'home-fullbody', routineName, blocks }
}

export interface ProgressionResult {
  ladderId: string
  before: ProgressState
  after: ProgressState
  /** 사람이 읽을 변화 설명 (다음 세션 처방 사유) */
  message: string
}

/**
 * 한 세션 결과를 반영해 사다리별 다음 처방을 계산한다.
 * 갱신된 ProgressState 배열과, 무엇이 왜 바뀌었는지의 메시지를 함께 돌려준다.
 */
export function applyProgression(
  states: ProgressState[],
  session: SessionLog,
  now = Date.now(),
): { states: ProgressState[]; results: ProgressionResult[] } {
  const results: ProgressionResult[] = []

  const nextStates = states.map((state) => {
    const ex = getExercise(state.exerciseId)
    const entries = session.entries.filter((e) => e.exerciseId === state.exerciseId)
    if (entries.length === 0) return state // 이번 세션에 안 한 운동은 그대로

    const metAll = entries.every((e) => e.actualReps >= e.targetReps)
    const rpes = entries.map((e) => e.rpe).filter((r): r is number => typeof r === 'number')
    const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : undefined

    const before = state
    const [, max] = rangeFor(state.ladderId, state.exerciseId)
    const step = stepFor(ex.kind)
    const unit = ex.kind === 'hold' ? '초' : '회'

    // 목표 미달 → 유지
    if (!metAll) {
      const after = { ...state, updatedAt: now }
      results.push({
        ladderId: state.ladderId,
        before,
        after,
        message: `${ex.name}: 목표를 다 못 채워 ${state.targetReps}${unit} 유지하며 한 번 더 숙달해요.`,
      })
      return after
    }

    // RPE가 매우 높으면(거의 실패 직전) 더 천천히: 목표 1단계만, 변형 승급은 보류
    const grinding = avgRpe !== undefined && avgRpe >= 9.5

    // 목표 달성 → 목표 증가 시도
    const raised = state.targetReps + step
    if (raised <= max || grinding) {
      const after = { ...state, targetReps: Math.min(raised, max), updatedAt: now }
      const reserve =
        avgRpe !== undefined && avgRpe <= 7 ? ' (아직 여유가 있어요!)' : ''
      results.push({
        ladderId: state.ladderId,
        before,
        after,
        message: `${ex.name}: 목표 달성 → 다음엔 ${after.targetReps}${unit}에 도전.${reserve}`,
      })
      return after
    }

    // 범위 최댓값 도달 → 더 어려운 변형으로 승급
    const ladder = getLadder(state.ladderId)
    const idx = ladder.exerciseIds.indexOf(state.exerciseId)
    const nextId = ladder.exerciseIds[idx + 1]

    if (!nextId) {
      // 최고 난이도: 변형이 없으니 목표를 계속 늘려 자극 유지
      const after = { ...state, targetReps: raised, updatedAt: now }
      results.push({
        ladderId: state.ladderId,
        before,
        after,
        message: `${ex.name}: 최고 난이도! 목표를 ${after.targetReps}${unit}로 늘려 계속 자극해요.`,
      })
      return after
    }

    const [nextMin] = rangeFor(state.ladderId, nextId)
    const nextEx = getExercise(nextId)
    const after: ProgressState = {
      ...state,
      exerciseId: nextId,
      targetReps: nextMin,
      updatedAt: now,
    }
    results.push({
      ladderId: state.ladderId,
      before,
      after,
      message: `🎉 ${ex.name} 졸업! 다음 단계 「${nextEx.name}」 ${nextMin}${nextEx.kind === 'hold' ? '초' : '회'}부터 시작해요.`,
    })
    return after
  })

  return { states: nextStates, results }
}

/** 주간 운동 요일 (0=일 … 6=토). 월·화·목·금 = 주 4회 */
export const TRAINING_WEEKDAYS = [1, 2, 4, 5]

export function isTrainingDay(date: Date): boolean {
  return TRAINING_WEEKDAYS.includes(date.getDay())
}

/** 전체 사다리 목록 (설정/통계용) */
export const ALL_LADDERS = Object.values(LADDERS)
