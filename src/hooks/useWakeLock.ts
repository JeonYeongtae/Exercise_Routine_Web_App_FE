import { useCallback, useEffect, useRef } from 'react'

// ── 화면 꺼짐 방지 (Screen Wake Lock API) ─────────────────────────
// 운동 중 화면이 자동으로 꺼지지 않게 한다. 탭이 다시 보이면 재획득.
// 미지원 브라우저(일부 iOS 버전)에서는 조용히 무시된다.

type WakeLockSentinelLike = { release: () => Promise<void> } | null

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike>(null)

  const request = useCallback(async () => {
    try {
      const wl = (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
      }).wakeLock
      if (!wl) return
      sentinelRef.current = await wl.request('screen')
    } catch {
      // 권한/지원 문제는 무시 (핵심 기능 아님)
    }
  }, [])

  const release = useCallback(async () => {
    try {
      await sentinelRef.current?.release()
    } catch {
      /* noop */
    }
    sentinelRef.current = null
  }, [])

  useEffect(() => {
    if (!active) {
      void release()
      return
    }
    void request()

    const onVisible = () => {
      if (document.visibilityState === 'visible' && active) void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void release()
    }
  }, [active, request, release])
}
