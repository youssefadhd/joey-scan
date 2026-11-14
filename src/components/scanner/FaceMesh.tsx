import { useEffect, useRef, type RefObject } from 'react'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { faceRenderer } from '../../engine/graphics/FaceRenderer'

type FaceMeshProps = {
  videoRef: RefObject<HTMLVideoElement>
  landmarksRef: RefObject<NormalizedLandmark[] | null>
  subscribe: (listener: () => void) => () => void
  mirrored: boolean
  active: boolean
}

export function FaceMesh({ videoRef, landmarksRef, subscribe, mirrored, active }: FaceMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const draw = () => faceRenderer.draw(canvas, video, landmarksRef.current, mirrored)
    const unsubscribe = subscribe(draw)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
    if (observer) observer.observe(canvas)
    else window.addEventListener('resize', draw, { passive: true })
    video.addEventListener('resize', draw)
    video.addEventListener('loadedmetadata', draw)
    draw()
    return () => {
      unsubscribe()
      observer?.disconnect()
      window.removeEventListener('resize', draw)
      video.removeEventListener('resize', draw)
      video.removeEventListener('loadedmetadata', draw)
      const context = canvas.getContext('2d')
      context?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [videoRef, landmarksRef, subscribe, mirrored, active])

  return <canvas ref={canvasRef} className="face-mesh" aria-hidden="true" />
}
