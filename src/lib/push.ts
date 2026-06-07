// ── 웹 푸시 구독 클라이언트 ────────────────────────────────────────
// 백엔드(BE)의 VAPID 공개키로 구독하고, 예약 알림 설정을 서버에 등록한다.
// 서버 주소는 설정에 저장된 값(또는 VITE_PUSH_API)을 SettingsPage가 넘겨준다.

/** 브라우저가 푸시 알림을 지원하는지 */
export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS는 홈 화면에 설치(standalone)된 PWA에서만 푸시가 동작한다. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** 현재 알림 권한 상태 */
export function notificationPermission(): NotificationPermission {
  return isPushSupported() ? Notification.permission : 'denied'
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  // BufferSource 호환을 위해 명시적 ArrayBuffer 위에 할당
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready
}

/** 현재 활성 구독(있으면) */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await registration()
  return reg.pushManager.getSubscription()
}

export interface ReminderOptions {
  apiUrl: string
  hour: number
  minute: number
  weekdays: number[]
}

/** 권한 요청 → 구독 → 서버에 예약 알림 등록 */
export async function enablePush(opts: ReminderOptions): Promise<void> {
  if (!isPushSupported()) throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.')
  const api = trimUrl(opts.apiUrl)
  if (!api) throw new Error('알림 서버 주소를 먼저 입력하세요.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('알림 권한이 거부되었어요. 설정에서 허용해주세요.')

  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const key = await fetch(`${api}/vapidPublicKey`).then((r) => {
      if (!r.ok) throw new Error('서버에서 VAPID 키를 받지 못했어요. 서버 주소를 확인하세요.')
      return r.text()
    })
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }

  const res = await fetch(`${api}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      hour: opts.hour,
      minute: opts.minute,
      weekdays: opts.weekdays,
    }),
  })
  if (!res.ok) throw new Error('서버에 구독을 등록하지 못했어요.')
}

/** 구독 해제 (서버에서도 제거) */
export async function disablePush(apiUrl: string): Promise<void> {
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const api = trimUrl(apiUrl)
  if (api) {
    await fetch(`${api}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
  }
  await sub.unsubscribe()
}

/** 테스트 알림 즉시 발송 요청 */
export async function sendTestPush(apiUrl: string): Promise<void> {
  const api = trimUrl(apiUrl)
  if (!api) throw new Error('알림 서버 주소를 먼저 입력하세요.')
  const sub = await getExistingSubscription()
  const res = await fetch(`${api}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: sub?.endpoint }),
  })
  if (!res.ok) throw new Error('테스트 알림 발송에 실패했어요. 먼저 알림을 켰는지 확인하세요.')
}
