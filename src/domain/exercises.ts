import type { Exercise, Ladder } from './types'

// ── 운동 라이브러리 ────────────────────────────────────────────────
// 각 운동은 "난이도 사다리(ladder)" 안의 한 칸이다.
// 과부하 엔진은 목표 횟수를 다 채우면 같은 사다리의 다음(더 어려운) 칸으로 올린다.

export const EXERCISES: Record<string, Exercise> = {
  // ── 밀기: 푸시업 계열 (맨몸) ──
  'pushup-knee': {
    id: 'pushup-knee',
    name: '무릎 푸시업',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 1,
    ladderId: 'push',
    cues: ['무릎을 바닥에 대고 시작', '몸통은 머리부터 무릎까지 일직선', '가슴이 바닥에 닿기 직전까지 내려가기'],
  },
  pushup: {
    id: 'pushup',
    name: '일반 푸시업',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 2,
    ladderId: 'push',
    cues: ['손은 어깨너비보다 약간 넓게', '복부와 엉덩이에 힘을 줘 몸을 일직선으로', '팔꿈치는 45도, 가슴 먼저 내려가기'],
  },
  'pushup-decline': {
    id: 'pushup-decline',
    name: '디클라인 푸시업',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 3,
    ladderId: 'push',
    cues: ['발을 의자나 디핑바에 올려 상체를 더 낮게', '가슴 윗부분 자극을 느끼며', '허리가 꺾이지 않게 코어 유지'],
  },
  'pushup-archer': {
    id: 'pushup-archer',
    name: '아처 푸시업',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 4,
    ladderId: 'push',
    cues: ['양손을 넓게, 한쪽으로 무게를 실어 내려가기', '반대팔은 거의 펴진 상태로 보조', '좌우 번갈아 같은 횟수로'],
  },
  'pushup-pseudo': {
    id: 'pushup-pseudo',
    name: '의족 푸시업',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 5,
    ladderId: 'push',
    cues: ['손끝이 발쪽을 향하게 손목 회전', '어깨를 앞으로 기울여 체중을 손에 싣기', '천천히, 어깨 전면을 강하게 느끼며'],
  },

  // ── 밀기: 딥스 계열 (치닝디핑) ──
  'dip-bench': {
    id: 'dip-bench',
    name: '벤치 딥스',
    pattern: 'push',
    kind: 'reps',
    equipment: ['none'],
    level: 1,
    ladderId: 'dip',
    cues: ['의자나 바에 손을 짚고 발은 앞 바닥에', '팔꿈치가 90도 될 때까지 내려가기', '어깨가 말리지 않게 가슴을 살짝 들기'],
  },
  dip: {
    id: 'dip',
    name: '딥스',
    pattern: 'push',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 2,
    ladderId: 'dip',
    cues: ['디핑바를 잡고 몸을 띄운 상태로 시작', '상체를 약간 앞으로 기울이면 가슴, 세우면 삼두', '어깨가 귀에서 멀어지게, 끝까지 펴기'],
  },
  'dip-tempo': {
    id: 'dip-tempo',
    name: '템포 딥스 (3초 하강)',
    pattern: 'push',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 3,
    ladderId: 'dip',
    cues: ['내려갈 때 3초에 걸쳐 천천히', '맨 아래에서 1초 정지', '근육의 긴장 시간을 늘려 자극 극대화'],
  },

  // ── 당기기: 풀업 계열 (치닝디핑) ──
  deadhang: {
    id: 'deadhang',
    name: '데드행 (버티기)',
    pattern: 'pull',
    kind: 'hold',
    equipment: ['chinning-dipping'],
    level: 1,
    ladderId: 'pull',
    cues: ['바를 어깨너비로 잡고 매달리기', '어깨를 으쓱 내려 견갑을 살짝 모으기', '정해진 시간 동안 버티며 그립과 광배 적응'],
    defaultHoldSec: 20,
  },
  'pullup-negative': {
    id: 'pullup-negative',
    name: '네거티브 풀업',
    pattern: 'pull',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 2,
    ladderId: 'pull',
    cues: ['점프해서 턱이 바 위로 간 상태에서 시작', '3~5초에 걸쳐 아주 천천히 내려오기', '내려오는 힘(편심)에 집중'],
  },
  chinup: {
    id: 'chinup',
    name: '친업 (손바닥 안쪽)',
    pattern: 'pull',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 3,
    ladderId: 'pull',
    cues: ['손바닥이 나를 향하게 잡기 (이두 동원, 더 쉬움)', '가슴을 바에 가져간다는 느낌으로', '맨 아래에서 팔을 완전히 펴기'],
  },
  pullup: {
    id: 'pullup',
    name: '풀업 (손등 바깥쪽)',
    pattern: 'pull',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 4,
    ladderId: 'pull',
    cues: ['손등이 나를 향하게 잡기 (광배 집중)', '견갑을 먼저 내리고 팔꿈치를 옆구리로', '반동 없이 컨트롤하며'],
  },

  // ── 코어 (치닝디핑 / 맨몸) ──
  plank: {
    id: 'plank',
    name: '플랭크',
    pattern: 'core',
    kind: 'hold',
    equipment: ['none'],
    level: 1,
    ladderId: 'core',
    cues: ['팔꿈치는 어깨 바로 아래', '엉덩이가 처지거나 솟지 않게 일직선', '복부와 둔근에 힘을 주고 버티기'],
    defaultHoldSec: 30,
  },
  'knee-raise-hang': {
    id: 'knee-raise-hang',
    name: '행잉 니레이즈',
    pattern: 'core',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 2,
    ladderId: 'core',
    cues: ['바에 매달려 무릎을 가슴쪽으로 당기기', '반동 없이 복부 힘으로만', '천천히 내리며 흔들림 제어'],
  },
  'leg-raise-hang': {
    id: 'leg-raise-hang',
    name: '행잉 레그레이즈',
    pattern: 'core',
    kind: 'reps',
    equipment: ['chinning-dipping'],
    level: 3,
    ladderId: 'core',
    cues: ['다리를 편 채로 바닥과 수평까지 올리기', '허리 반동 금지, 복부로만', '내릴 때도 천천히 컨트롤'],
  },
}

export const LADDERS: Record<string, Ladder> = {
  push: {
    id: 'push',
    label: '가슴 밀기 (푸시업)',
    pattern: 'push',
    exerciseIds: ['pushup-knee', 'pushup', 'pushup-decline', 'pushup-archer', 'pushup-pseudo'],
    repRange: [8, 12],
  },
  dip: {
    id: 'dip',
    label: '가슴·삼두 (딥스)',
    pattern: 'push',
    exerciseIds: ['dip-bench', 'dip', 'dip-tempo'],
    repRange: [6, 12],
  },
  pull: {
    id: 'pull',
    label: '등·이두 (풀업)',
    pattern: 'pull',
    exerciseIds: ['deadhang', 'pullup-negative', 'chinup', 'pullup'],
    repRange: [5, 10],
  },
  core: {
    id: 'core',
    label: '코어 (복근)',
    pattern: 'core',
    exerciseIds: ['plank', 'knee-raise-hang', 'leg-raise-hang'],
    repRange: [8, 15],
  },
}

/** hold(버티기) 운동의 진행 범위(초). 사다리별 */
export const HOLD_RANGE: Record<string, [number, number]> = {
  pull: [15, 45], // 데드행
  core: [20, 60], // 플랭크
}

export function getExercise(id: string): Exercise {
  const ex = EXERCISES[id]
  if (!ex) throw new Error(`Unknown exercise: ${id}`)
  return ex
}

export function getLadder(id: string): Ladder {
  const l = LADDERS[id]
  if (!l) throw new Error(`Unknown ladder: ${id}`)
  return l
}
