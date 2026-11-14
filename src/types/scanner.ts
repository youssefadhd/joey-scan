export type CameraFacing = 'user' | 'environment'

export type CameraErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'no-camera'
  | 'camera-in-use'
  | 'constraint-failed'
  | 'interrupted'
  | 'video-playback'
  | 'initialization-failed'

export class CameraError extends Error {
  readonly cause?: unknown
  constructor(public readonly code: CameraErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'CameraError'
    this.cause = options?.cause
  }
}

export type CameraDevice = { deviceId: string; label: string; groupId: string }

export type FaceTrackingStatus = 'idle' | 'loading' | 'searching' | 'tracking' | 'error'
export type FaceTrackingErrorCode = 'model-unavailable' | 'wasm-unavailable' | 'initialization-failed' | 'inference-failed'

export class FaceTrackingError extends Error {
  readonly cause?: unknown
  constructor(public readonly code: FaceTrackingErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'FaceTrackingError'
    this.cause = options?.cause
  }
}
