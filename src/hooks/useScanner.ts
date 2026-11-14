import { useCallback, useState } from 'react'
import { useCamera } from './useCamera'
import { useFaceTracking } from './useFaceTracking'

export function useScanner() {
  const camera = useCamera()
  const [scanRequested, setScanRequested] = useState(false)
  const face = useFaceTracking(camera.videoRef, scanRequested && camera.isReady)
  const { error: cameraError, ...cameraState } = camera
  const { error: trackingError, ...faceState } = face

  const start = useCallback(() => {
    setScanRequested(true)
    void camera.start('user')
  }, [camera.start])
  const stop = useCallback(() => {
    setScanRequested(false)
    camera.stop()
  }, [camera.stop])
  const retryCamera = useCallback(() => { setScanRequested(true); camera.retry() }, [camera.retry])
  const switchCamera = useCallback(() => camera.switchCamera(), [camera.switchCamera])

  return {
    ...cameraState,
    ...faceState,
    cameraError,
    trackingError,
    scanRequested,
    isScanning: scanRequested && camera.isReady,
    start,
    stop,
    retryCamera,
    switchCamera,
  }
}
