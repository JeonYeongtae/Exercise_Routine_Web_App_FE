// ── 도메인 타입 정의 ───────────────────────────────────────────────

/** 동작 패턴: 밀기 / 당기기 / 코어 / 하체 */
export type MovementPattern = 'push' | 'pull' | 'core' | 'legs'

/** 한 회(rep)의 이상적 템포(초). 근비대를 위해 보통 내려갈 때 천천히, 올라갈 때 빠르게. */
export interface Tempo {
  /** 내려가기(이심성) 초 */
  down: number
  /** 올라가기(구심성) 초 */
  up: number
  /** 맨 아래 정지 초 (선택) */
  pauseDown?: number
  /** 맨 위 정지 초 (선택) */
  pauseUp?: number
}

/** 운동 측정 방식: 횟수(reps) / 시간 버티기(hold) */
export type ExerciseKind = 'reps' | 'hold'

/** 사용 기구 */
export type Equipment = 'none' | 'chinning-dipping'

/** 한 가지 운동 변형(난이도 단계의 한 칸) */
export interface Exercise {
  id: string
  name: string
  pattern: MovementPattern
  kind: ExerciseKind
  equipment: Equipment[]
  /** 진행 사다리(ladder) 안에서의 난이도. 작을수록 쉬움 */
  level: number
  /** 같은 사다리에 속한 운동끼리 공유하는 id */
  ladderId: string
  /** 실시간 코칭용 자세 큐 (음성으로 안내) */
  cues: string[]
  /** hold 방식일 때 기본 목표 초, reps일 때는 무시 */
  defaultHoldSec?: number
  /** reps 운동의 권장 템포 (없으면 기본값 사용). hold 운동은 무시 */
  tempo?: Tempo
  /** 자세히 보기용 상세 설명 (단계별 세팅·호흡·흔한 실수) */
  detail?: string[]
}

/** 난이도 사다리: 쉬움 → 어려움 순서의 운동 id 배열 */
export interface Ladder {
  id: string
  label: string
  pattern: MovementPattern
  /** level 오름차순 정렬된 exercise id 목록 */
  exerciseIds: string[]
  /** 근비대 목표 반복 범위 [최소, 최대] */
  repRange: [number, number]
}

/**
 * 사용자의 현재 진행 상태(사다리별 1개).
 * 과부하 엔진이 매 세션 결과로 이 값을 갱신한다.
 */
export interface ProgressState {
  ladderId: string
  /** 현재 수행 중인 변형 */
  exerciseId: string
  /** 목표 세트 수 */
  targetSets: number
  /** 현재 세트당 목표 횟수(또는 초). repRange 안에서 움직임 */
  targetReps: number
  /** 마지막으로 갱신된 시각(ms) */
  updatedAt: number
}

/** 하루 루틴 안의 한 블록(= 사다리 1개에 대한 처방) */
export interface RoutineBlock {
  exerciseId: string
  ladderId: string
  sets: number
  /** reps 운동이면 목표 횟수, hold 운동이면 목표 초 */
  target: number
  kind: ExerciseKind
  restSec: number
}

/** 특정 날짜에 배정된 하루 루틴 */
export interface DayPlan {
  date: string // 'yyyy-MM-dd'
  routineId: string
  routineName: string
  blocks: RoutineBlock[]
}

/** 실제 수행한 한 세트의 기록 */
export interface SetEntry {
  exerciseId: string
  setIndex: number
  targetReps: number
  actualReps: number
  /** 운동 강도 체감(RPE 6~10). 10 = 한 개도 더 못함 */
  rpe?: number
}

/** 완료/진행 중인 한 번의 운동 세션 기록 */
export interface SessionLog {
  id?: number
  date: string // 'yyyy-MM-dd'
  routineName: string
  startedAt: number
  completedAt?: number
  entries: SetEntry[]
}

/** 단백질 섭취 1건 기록 */
export interface ProteinEntry {
  id?: number
  date: string // 'yyyy-MM-dd'
  grams: number
  label: string
  at: number // 기록 시각(ms)
}
