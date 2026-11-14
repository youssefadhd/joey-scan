import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { FACE_DETECTION_CONFIDENCE, FACE_MODEL_PATH, MEDIAPIPE_WASM_PATH } from '../../config/scanner'
import { FaceTrackingError } from '../../types/scanner'

/** Shared on-device FaceLandmarker. Initialization is coalesced across callers. */
export class FaceEngine {
  private static instance: FaceEngine | null = null
  private static initialization: Promise<FaceEngine> | null = null
  private static consumers = 0
  private static disposeTimer = 0
  private lastTimestamp = -1

  private constructor(private readonly landmarker: FaceLandmarker) {}

  static load(): Promise<FaceEngine> {
    if (FaceEngine.instance) return Promise.resolve(FaceEngine.instance)
    if (FaceEngine.initialization) return FaceEngine.initialization
    FaceEngine.initialization = FaceEngine.create()
    return FaceEngine.initialization
  }

  static retain(): () => void {
    FaceEngine.consumers += 1
    window.clearTimeout(FaceEngine.disposeTimer)
    let released = false
    return () => {
      if (released) return
      released = true
      FaceEngine.consumers = Math.max(0, FaceEngine.consumers - 1)
      FaceEngine.disposeTimer = window.setTimeout(() => {
        if (FaceEngine.consumers !== 0) return
        const dispose = (engine: FaceEngine) => { if (FaceEngine.consumers === 0) engine.close() }
        if (FaceEngine.instance) dispose(FaceEngine.instance)
        else if (FaceEngine.initialization) void FaceEngine.initialization.then(dispose, () => undefined)
      }, 1500)
    }
  }

  private static async create(): Promise<FaceEngine> {
    let vision
    try {
      vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH)
    } catch (error) {
      FaceEngine.initialization = null
      throw new FaceTrackingError('wasm-unavailable', 'The face tracking runtime could not be loaded.', { cause: error })
    }

    const options = {
      baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'GPU' as const },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      minFaceDetectionConfidence: FACE_DETECTION_CONFIDENCE,
      minFacePresenceConfidence: FACE_DETECTION_CONFIDENCE,
      minTrackingConfidence: FACE_DETECTION_CONFIDENCE,
      outputFacialTransformationMatrixes: true,
    }

    try {
      const landmarker = await FaceLandmarker.createFromOptions(vision, options)
      const engine = new FaceEngine(landmarker)
      FaceEngine.instance = engine
      return engine
    } catch (gpuError) {
      // Some mobile browsers expose WebGL but cannot run this graph reliably. CPU is slower,
      // but provides a stable supported fallback rather than leaving scanning unusable.
      try {
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          ...options, baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'CPU' },
        })
        const engine = new FaceEngine(landmarker)
        FaceEngine.instance = engine
        return engine
      } catch (cpuError) {
        FaceEngine.initialization = null
        const detail = cpuError instanceof Error ? cpuError.message.toLowerCase() : ''
        if (detail.includes('model') || detail.includes('fetch') || detail.includes('404')) {
          throw new FaceTrackingError('model-unavailable', 'The face tracking model could not be loaded.', { cause: cpuError ?? gpuError })
        }
        throw new FaceTrackingError('initialization-failed', 'Face tracking could not be initialized.', { cause: cpuError ?? gpuError })
      }
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      throw new FaceTrackingError('inference-failed', 'The camera frame is not ready yet.')
    }
    const timestamp = Math.max(timestampMs, this.lastTimestamp + 0.01)
    this.lastTimestamp = timestamp
    try {
      return this.landmarker.detectForVideo(video, timestamp)
    } catch (error) {
      throw new FaceTrackingError('inference-failed', 'Face tracking paused unexpectedly.', { cause: error })
    }
  }

  close(): void {
    this.landmarker.close()
    if (FaceEngine.instance === this) {
      FaceEngine.instance = null
      FaceEngine.initialization = null
    }
  }
}

export function faceTrackingErrorMessage(error: unknown): string {
  if (!(error instanceof FaceTrackingError)) return 'Face tracking could not start. Please retry.'
  switch (error.code) {
    case 'model-unavailable': return 'The face tracking model is unavailable. Check your connection and retry.'
    case 'wasm-unavailable': return 'The face tracking engine could not load. Reload the page and retry.'
    case 'inference-failed': return 'Face tracking paused. Reposition your face and retry.'
    default: return 'Face tracking could not start. Please retry.'
  }
}
