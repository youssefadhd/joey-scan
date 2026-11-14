import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { FaceEngine, faceTrackingErrorMessage } from '../engine/vision/FaceEngine'
import type { FaceTrackingStatus } from '../types/scanner'

type VideoFrameMetadata = { mediaTime: number }
type VideoWithFrameCallbacks = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: VideoFrameMetadata) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}
type Listener = () => void

const TARGET_FPS = 30

export function useFaceTracking(videoRef: RefObject<HTMLVideoElement>, enabled: boolean) {
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null)
  const listenersRef = useRef(new Set<Listener>())
  const [status, setStatus] = useState<FaceTrackingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [retryVersion, setRetryVersion] = useState(0)
  const statusRef = useRef<FaceTrackingStatus>('idle')

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener)
    return () => { listenersRef.current.delete(listener) }
  }, [])

  const retry = useCallback(() => setRetryVersion(value => value + 1), [])

  useEffect(() => {
    let disposed = false
    let engine: FaceEngine | null = null
    let scheduledId: number | null = null
    let usingVideoFrameCallback = false
    let minimumInterval = 1000 / TARGET_FPS
    let lastInferenceAt = 0
    let lastFrameTime = -1
    let lastTimestamp = 0
    let measuredFrames = 0
    let fpsWindowStart = performance.now()
    let durations: number[] = []
    let lastHasFace: boolean | null = null
    const lowMemory = ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4
    const engineRelease = FaceEngine.retain()
    statusRef.current = enabled ? 'loading' : 'idle'
    setStatus(statusRef.current)
    setError(null)
    setFps(0)
    landmarksRef.current = null

    const publish = () => listenersRef.current.forEach(listener => listener())
    const updateStatus = (next: FaceTrackingStatus) => {
      if (statusRef.current === next) return
      statusRef.current = next
      if (!disposed) setStatus(next)
    }

    if (!enabled) {
      publish()
      return () => { disposed = true; engineRelease() }
    }

    const video = videoRef.current
    if (!video) {
      setError('Camera preview is not ready. Retry to continue.')
      updateStatus('error')
      return () => { disposed = true; engineRelease() }
    }

    const videoWithCallbacks = video as VideoWithFrameCallbacks

    const cancelScheduled = () => {
      if (scheduledId === null) return
      if (usingVideoFrameCallback) videoWithCallbacks.cancelVideoFrameCallback?.(scheduledId)
      else cancelAnimationFrame(scheduledId)
      scheduledId = null
    }

    const fail = (failure: unknown) => {
      if (disposed) return
      cancelScheduled()
      setError(faceTrackingErrorMessage(failure))
      updateStatus('error')
    }

    const onFrame = (now: number, mediaTime?: number) => {
      scheduledId = null
      if (disposed || document.visibilityState === 'hidden') return
      if (!engine) return
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth <= 0 || video.videoHeight <= 0) {
        schedule()
        return
      }
      const frameTime = mediaTime ?? video.currentTime
      if (frameTime !== lastFrameTime && now - lastInferenceAt >= minimumInterval) {
        lastFrameTime = frameTime
        lastInferenceAt = now
        const startedAt = performance.now()
        try {
          const result = engine.detect(video, Math.max(now, lastTimestamp + 1))
          lastTimestamp = Math.max(now, lastTimestamp + 1)
          const inferenceMs = performance.now() - startedAt
          durations.push(inferenceMs)
          if (durations.length > 12) durations = durations.slice(-12)
          const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length
          const fpsTarget = lowMemory ? 24 : TARGET_FPS
          minimumInterval = average >= 58 ? 1000 / 12 : average >= 42 ? 1000 / 18 : average >= 33 ? 1000 / 24 : 1000 / fpsTarget

          const detected = result.faceLandmarks[0] ?? null
          landmarksRef.current = detected
          const hasFace = detected !== null
          if (lastHasFace !== hasFace) {
            lastHasFace = hasFace
            updateStatus(hasFace ? 'tracking' : 'searching')
          }
          publish()
          measuredFrames += 1
          if (now - fpsWindowStart >= 1000) {
            const sampleFps = measuredFrames * 1000 / (now - fpsWindowStart)
            if (!disposed) setFps(Math.round(sampleFps))
            measuredFrames = 0
            fpsWindowStart = now
          }
        } catch (failure) { fail(failure); return }
      }
      schedule()
    }

    function schedule() {
      if (disposed || !engine || scheduledId !== null || document.visibilityState === 'hidden') return
      usingVideoFrameCallback = typeof videoWithCallbacks.requestVideoFrameCallback === 'function'
      if (usingVideoFrameCallback) {
        scheduledId = videoWithCallbacks.requestVideoFrameCallback!((now, metadata) => onFrame(now, metadata.mediaTime))
      } else {
        scheduledId = requestAnimationFrame(now => onFrame(now))
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') cancelScheduled()
      else {
        // Forget the last presentation timestamp after suspension; the next frame must be fresh.
        lastFrameTime = -1
        schedule()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    void FaceEngine.load().then(loaded => {
      if (disposed) return
      engine = loaded
      updateStatus('searching')
      schedule()
    }).catch(fail)

    return () => {
      disposed = true
      cancelScheduled()
      document.removeEventListener('visibilitychange', onVisibility)
      landmarksRef.current = null
      publish()
      engineRelease()
    }
  }, [enabled, retryVersion, videoRef])

  return { landmarksRef, status, error, fps, subscribe, retry }
}
