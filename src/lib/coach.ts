// ── 실시간 코칭 보조 (음성 / 진동 / 비프) ─────────────────────────
// 모두 브라우저 내장 API. 서버 불필요. iOS는 사용자 제스처 이후에만 소리/음성 가능.

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  return audioCtx
}

/** iOS는 첫 사용자 탭에서 오디오/음성을 깨워줘야 한다. 운동 시작 버튼에서 호출. */
export function unlockAudio(): void {
  const ctx = getAudioCtx()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
  // 음성 합성도 빈 발화로 한 번 깨운다
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

/** 짧은 비프음 (주파수/길이 조절) */
export function beep(freq = 880, durationMs = 150, volume = 0.2): void {
  const ctx = getAudioCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.value = volume
  osc.connect(gain)
  gain.connect(ctx.destination)
  const now = ctx.currentTime
  osc.start(now)
  // 끝에서 살짝 페이드아웃 (딸깍음 방지)
  gain.gain.setValueAtTime(volume, now + durationMs / 1000 - 0.02)
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000)
  osc.stop(now + durationMs / 1000)
}

/** 카운트다운 마지막 3·2·1 틱과 시작음 */
export function tick(): void {
  beep(660, 120, 0.15)
}
export function startBeep(): void {
  beep(990, 400, 0.25)
}

/** 한국어 음성 안내 */
export function speak(text: string): void {
  if (!('speechSynthesis' in window) || !text) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.rate = 1.0
  u.pitch = 1.0
  // 한국어 보이스가 있으면 우선 사용
  const koVoice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('ko'))
  if (koVoice) u.voice = koVoice
  window.speechSynthesis.cancel() // 이전 발화 끊고 최신 안내 우선
  window.speechSynthesis.speak(u)
}

/** 진동 (지원 기기에서만. iOS 사파리는 미지원일 수 있음) */
export function vibrate(pattern: number | number[] = 200): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}
