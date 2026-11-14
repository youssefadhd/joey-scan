import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type FaceLandmarks = NormalizedLandmark[]
export type FaceTrackingSnapshot = {
  landmarks: FaceLandmarks | null
  inferenceMs: number
  fps: number
}
