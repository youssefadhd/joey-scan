import { CAMERA_FRAME_RATE, CAMERA_HEIGHT, CAMERA_MAX_HEIGHT, CAMERA_MAX_WIDTH, CAMERA_WIDTH } from '../../config/scanner'
import { CameraError, type CameraDevice, type CameraFacing } from '../../types/scanner'

const VIDEO_READY_TIMEOUT_MS = 15_000

function asCameraError(error: unknown): CameraError {
  if (error instanceof CameraError) return error
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return new CameraError('permission-denied', 'Camera permission was denied.', { cause: error })
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return new CameraError('no-camera', 'No camera was found on this device.', { cause: error })
  if (name === 'NotReadableError' || name === 'TrackStartError') return new CameraError('camera-in-use', 'The camera is unavailable or already in use.', { cause: error })
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') return new CameraError('constraint-failed', 'This camera cannot meet the requested settings.', { cause: error })
  if (name === 'AbortError') return new CameraError('interrupted', 'The camera request was interrupted.', { cause: error })
  return new CameraError('initialization-failed', 'The camera could not be started.', { cause: error })
}

function isConstraintError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError')
}

function waitForMetadata(video: HTMLVideoElement, timeoutMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new CameraError('interrupted', 'The camera request was cancelled.'))
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let timeout = 0
    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadedmetadata', check)
      video.removeEventListener('loadeddata', check)
      video.removeEventListener('resize', check)
      video.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const check = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve()
      }
    }
    const onError = () => { cleanup(); reject(new CameraError('video-playback', 'The camera preview could not be read.')) }
    const onAbort = () => { cleanup(); reject(new CameraError('interrupted', 'The camera request was cancelled.')) }
    video.addEventListener('loadedmetadata', check)
    video.addEventListener('loadeddata', check)
    video.addEventListener('resize', check)
    video.addEventListener('error', onError, { once: true })
    signal.addEventListener('abort', onAbort, { once: true })
    timeout = window.setTimeout(() => {
      cleanup()
      reject(new CameraError('video-playback', 'The camera preview took too long to start.'))
    }, timeoutMs)
    check()
  })
}

/** Owns one live camera stream and its attached mobile-safe preview element. */
export class CameraEngine {
  private static activeOwner: CameraEngine | null = null
  private stream: MediaStream | null = null
  private video: HTMLVideoElement | null = null
  private operation = 0
  private startAbort: AbortController | null = null
  private facing: CameraFacing = 'user'
  private interruptedListener: (() => void) | null = null

  get currentStream(): MediaStream | null { return this.stream }
  get currentFacing(): CameraFacing { return this.facing }
  get isActive(): boolean { return !!this.stream?.getVideoTracks().some(track => track.readyState === 'live') }

  onInterrupted(listener: (() => void) | null): void { this.interruptedListener = listener }

  async enumerateCameras(): Promise<CameraDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'videoinput').map(device => ({
        deviceId: device.deviceId, label: device.label || 'Camera', groupId: device.groupId,
      }))
    } catch { return [] }
  }

  async start(video: HTMLVideoElement, facing: CameraFacing = 'user'): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported', 'This browser does not support camera access.')
    const operation = ++this.operation
    this.startAbort?.abort()
    const abortController = new AbortController()
    this.startAbort = abortController
    const previousOwner = CameraEngine.activeOwner
    if (previousOwner && previousOwner !== this) previousOwner.stop()
    this.stopOwnedStream()
    CameraEngine.activeOwner = this
    this.video = video
    this.facing = facing

    const constraints: MediaStreamConstraints[] = [
      { audio: false, video: {
        facingMode: { ideal: facing }, width: { ideal: CAMERA_WIDTH, max: CAMERA_MAX_WIDTH },
        height: { ideal: CAMERA_HEIGHT, max: CAMERA_MAX_HEIGHT }, frameRate: { ideal: CAMERA_FRAME_RATE, max: CAMERA_FRAME_RATE },
      } },
      { audio: false, video: { facingMode: { ideal: facing } } },
      { audio: false, video: true },
    ]

    let stream: MediaStream | null = null
    let lastError: unknown
    for (let index = 0; index < constraints.length; index += 1) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints[index])
        break
      } catch (error) {
        lastError = error
        // Only retry less specific constraints when the device explicitly rejects a constraint.
        if (!isConstraintError(error) || index === constraints.length - 1) throw asCameraError(error)
      }
    }
    if (!stream) throw asCameraError(lastError)
    if (operation !== this.operation) {
      stream.getTracks().forEach(track => track.stop())
      throw new CameraError('interrupted', 'The camera request was cancelled.')
    }

    this.stream = stream
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) {
      this.stop()
      throw new CameraError('no-camera', 'No video camera was returned by the browser.')
    }
    videoTrack.addEventListener('ended', () => {
      if (operation !== this.operation) return
      this.interruptedListener?.()
    }, { once: true })

    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.setAttribute('autoplay', '')
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '') // iOS Safari's legacy inline-playback hint.
    video.srcObject = stream

    try {
      await waitForMetadata(video, VIDEO_READY_TIMEOUT_MS, abortController.signal)
      if (operation !== this.operation) throw new CameraError('interrupted', 'The camera request was cancelled.')
      await video.play()
      if (operation !== this.operation) throw new CameraError('interrupted', 'The camera request was cancelled.')
      return stream
    } catch (error) {
      if (operation === this.operation) this.stop()
      if (error instanceof CameraError) throw error
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        throw new CameraError('video-playback', 'Tap retry to resume the camera preview.', { cause: error })
      }
      throw asCameraError(error)
    } finally {
      if (this.startAbort === abortController) this.startAbort = null
    }
  }

  async switchCamera(video = this.video): Promise<MediaStream> {
    if (!video) throw new CameraError('initialization-failed', 'The camera preview is not ready.')
    const next: CameraFacing = this.facing === 'user' ? 'environment' : 'user'
    return this.start(video, next)
  }

  stop(): void {
    this.operation += 1
    this.startAbort?.abort()
    this.startAbort = null
    this.stopOwnedStream()
    if (CameraEngine.activeOwner === this) CameraEngine.activeOwner = null
    this.video = null
  }

  private stopOwnedStream(): void {
    const video = this.video
    const stream = this.stream
    this.stream = null
    if (stream) stream.getTracks().forEach(track => track.stop())
    if (video && video.srcObject === stream) {
      try { video.pause() } catch { /* A detached preview may no longer accept playback commands. */ }
      video.srcObject = null
    }
  }
}

export const cameraEngine = new CameraEngine()

export function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof CameraError)) return 'The camera could not be started. Check permissions and try again.'
  switch (error.code) {
    case 'unsupported': return 'This browser does not support camera access. Try a recent version of Safari or Chrome.'
    case 'permission-denied': return 'Camera access is turned off. Allow camera access in your browser settings, then try again.'
    case 'no-camera': return 'We couldn’t find a camera connected to this device.'
    case 'camera-in-use': return 'Another app or browser tab is using the camera. Close it and try again.'
    case 'constraint-failed': return 'This camera does not support the requested video settings. Try again.'
    case 'interrupted': return 'The camera connection was interrupted. Retry to reconnect.'
    case 'video-playback': return 'The camera preview could not start. Tap retry to resume it.'
    default: return 'The camera could not be started. Check permissions and try again.'
  }
}
