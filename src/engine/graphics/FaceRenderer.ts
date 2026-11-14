import { FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { LOW_MEMORY_CANVAS_DPR, MAX_CANVAS_DPR } from '../../config/scanner'
import { createVideoTransform, VIDEO_PROJECTION } from './VideoTransform'

const KEY_POINTS = new Set([1, 4, 10, 33, 61, 133, 152, 199, 234, 263, 291, 362, 454])

export class FaceRenderer {
  draw(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    landmarks: NormalizedLandmark[] | null,
    mirrored: boolean,
    viewport?: { width: number; height: number; pixelRatio?: number },
  ): void {
    const rect = canvas.getBoundingClientRect()
    const width = viewport?.width ?? rect.width
    const height = viewport?.height ?? rect.height
    if (width <= 0 || height <= 0) return

    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    const pixelRatio = viewport?.pixelRatio ?? Math.min(window.devicePixelRatio || 1, memory && memory <= 4 ? LOW_MEMORY_CANVAS_DPR : MAX_CANVAS_DPR)
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio))
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio))
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    if (!landmarks?.length || video.videoWidth <= 0 || video.videoHeight <= 0) return

    const transform = createVideoTransform(video.videoWidth, video.videoHeight, width, height, mirrored, VIDEO_PROJECTION)
    const point = (index: number) => {
      const landmark = landmarks[index]
      return landmark ? transform.map(landmark.x, landmark.y) : null
    }

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    for (const edge of FaceLandmarker.FACE_LANDMARKS_TESSELATION) {
      const from = point(edge.start)
      const to = point(edge.end)
      if (!from || !to) continue
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
    }
    context.strokeStyle = 'rgba(89, 235, 255, 0.48)'
    context.lineWidth = 0.65
    context.stroke()

    context.beginPath()
    for (const edge of FaceLandmarker.FACE_LANDMARKS_CONTOURS) {
      const from = point(edge.start)
      const to = point(edge.end)
      if (!from || !to) continue
      context.moveTo(from.x, from.y)
      context.lineTo(to.x, to.y)
    }
    context.strokeStyle = 'rgba(122, 247, 255, 0.9)'
    context.lineWidth = 1.15
    context.stroke()

    context.save()
    context.fillStyle = '#a5fbff'
    context.shadowColor = '#28dfff'
    context.shadowBlur = 6
    for (let index = 0; index < landmarks.length; index += 1) {
      if (index % 9 !== 0 && !KEY_POINTS.has(index)) continue
      const mapped = point(index)
      if (!mapped) continue
      context.beginPath()
      context.arc(mapped.x, mapped.y, KEY_POINTS.has(index) ? 1.7 : 1.1, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }
}

export const faceRenderer = new FaceRenderer()
