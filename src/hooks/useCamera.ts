import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraEngine, cameraErrorMessage } from '../engine/camera/CameraEngine'
import type { CameraDevice, CameraFacing } from '../types/scanner'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const mountedRef = useRef(false)
  const operationRef = useRef(0)
  const startingRef = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [facing, setFacing] = useState<CameraFacing>('user')
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    mountedRef.current = true
    cameraEngine.onInterrupted(() => {
      if (!mountedRef.current) return
      setIsReady(false)
      setStream(null)
      setError('The camera connection was interrupted. Retry to reconnect.')
    })
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || !mountedRef.current) return
      const current = cameraEngine.currentStream
      if (!current) return
      if (!cameraEngine.isActive) {
        setIsReady(false)
        setStream(null)
        setError('The camera connection was interrupted. Retry to reconnect.')
        return
      }
      const video = videoRef.current
      if (video?.paused) void video.play().catch(() => {
        if (mountedRef.current) setError('Tap retry to resume the camera preview.')
      })
    }
    document.addEventListener('visibilitychange', onVisibility)
    const onPageShow = () => onVisibility()
    window.addEventListener('pageshow', onPageShow)
    return () => {
      mountedRef.current = false
      operationRef.current += 1
      startingRef.current = false
      cameraEngine.onInterrupted(null)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      cameraEngine.stop()
    }
  }, [])

  const start = useCallback(async (nextFacing: CameraFacing = facing) => {
    const video = videoRef.current
    if (!video || !mountedRef.current || startingRef.current) return
    const operation = ++operationRef.current
    startingRef.current = true
    setError(null)
    setIsReady(false)
    setIsStarting(true)
    try {
      const activeStream = await cameraEngine.start(video, nextFacing)
      const available = await cameraEngine.enumerateCameras()
      if (!mountedRef.current || operation !== operationRef.current) return
      setStream(activeStream)
      setFacing(nextFacing)
      setDevices(available)
      setIsReady(true)
    } catch (cameraError) {
      if (!mountedRef.current || operation !== operationRef.current) return
      setStream(null)
      setError(cameraErrorMessage(cameraError))
    } finally {
      if (operation === operationRef.current) startingRef.current = false
      if (mountedRef.current && operation === operationRef.current) setIsStarting(false)
    }
  }, [facing, isStarting])

  const switchCamera = useCallback(() => {
    const next: CameraFacing = facing === 'user' ? 'environment' : 'user'
    void start(next)
  }, [facing, start])

  const stop = useCallback(() => {
    operationRef.current += 1
    startingRef.current = false
    cameraEngine.stop()
    setStream(null)
    setIsReady(false)
    setIsStarting(false)
  }, [])

  const retry = useCallback(() => { setError(null); void start(facing) }, [facing, start])

  return { videoRef, stream, isReady, isStarting, facing, devices, error, start, switchCamera, stop, retry }
}
