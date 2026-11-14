/** Shared object-fit: cover projection used by both the preview and landmark canvas. */
export type VideoTransform = {
  sourceWidth: number
  sourceHeight: number
  viewportWidth: number
  viewportHeight: number
  scale: number
  offsetX: number
  offsetY: number
  mirrored: boolean
  map: (x: number, y: number) => { x: number; y: number }
}

export const VIDEO_PROJECTION = { objectFit: 'cover' as const, objectPosition: { x: 0.5, y: 0.5 } }

export function videoProjectionStyle(mirrored: boolean) {
  return {
    objectFit: VIDEO_PROJECTION.objectFit,
    objectPosition: `${VIDEO_PROJECTION.objectPosition.x * 100}% ${VIDEO_PROJECTION.objectPosition.y * 100}%`,
    transform: mirrored ? 'scaleX(-1)' : 'none',
  }
}

export function createVideoTransform(
  sourceWidth: number,
  sourceHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  mirrored: boolean,
  options: { objectFit?: 'cover' | 'contain'; objectPosition?: { x: number; y: number } } = {},
): VideoTransform {
  const safeSourceWidth = Math.max(1, sourceWidth)
  const safeSourceHeight = Math.max(1, sourceHeight)
  const safeViewportWidth = Math.max(1, viewportWidth)
  const safeViewportHeight = Math.max(1, viewportHeight)
  const fit = options.objectFit ?? VIDEO_PROJECTION.objectFit
  const fitScale = fit === 'contain' ? Math.min : Math.max
  const scale = fitScale(safeViewportWidth / safeSourceWidth, safeViewportHeight / safeSourceHeight)
  const renderedWidth = safeSourceWidth * scale
  const renderedHeight = safeSourceHeight * scale
  const positionX = Math.max(0, Math.min(1, options.objectPosition?.x ?? VIDEO_PROJECTION.objectPosition.x))
  const positionY = Math.max(0, Math.min(1, options.objectPosition?.y ?? VIDEO_PROJECTION.objectPosition.y))
  const offsetX = (safeViewportWidth - renderedWidth) * positionX
  const offsetY = (safeViewportHeight - renderedHeight) * positionY

  return {
    sourceWidth: safeSourceWidth, sourceHeight: safeSourceHeight,
    viewportWidth: safeViewportWidth, viewportHeight: safeViewportHeight,
    scale, offsetX, offsetY, mirrored,
    map: (x, y) => {
      const projectedX = offsetX + x * safeSourceWidth * scale
      return { x: mirrored ? safeViewportWidth - projectedX : projectedX, y: offsetY + y * safeSourceHeight * scale }
    },
  }
}
