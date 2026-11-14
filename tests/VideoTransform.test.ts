import { describe, expect, it } from 'vitest'
import { createVideoTransform } from '../src/engine/graphics/VideoTransform'

describe('shared video projection', () => {
  it('keeps centered landmarks aligned in portrait cover crops', () => {
    const projection = createVideoTransform(1920, 1080, 390, 720, true)
    expect(projection.map(0.5, 0.5)).toEqual({ x: 195, y: 360 })
    expect(projection.scale).toBeCloseTo(2 / 3)
    expect(projection.offsetY).toBe(0)
    expect(projection.offsetX).toBeLessThan(0)
  })

  it('keeps centered landmarks aligned in landscape cover crops', () => {
    const projection = createVideoTransform(1080, 1920, 800, 420, false)
    expect(projection.map(0.5, 0.5)).toEqual({ x: 400, y: 210 })
    expect(projection.offsetY).toBeLessThan(0)
    expect(projection.offsetX).toBe(0)
  })

  it('mirrors normalized landmarks around the preview center', () => {
    const mirrored = createVideoTransform(640, 480, 390, 560, true)
    const left = mirrored.map(0.2, 0.4)
    const right = mirrored.map(0.8, 0.4)
    expect(left.x + right.x).toBeCloseTo(390)
    expect(left.y).toBeCloseTo(right.y)
  })

  it('supports the same object-position crop used by the video element', () => {
    const centered = createVideoTransform(1920, 1080, 390, 720, false)
    const leftAligned = createVideoTransform(1920, 1080, 390, 720, false, { objectPosition: { x: 0, y: 0.5 } })
    expect(leftAligned.offsetX).toBeCloseTo(0)
    expect(centered.offsetX).toBeLessThan(0)
    expect(leftAligned.map(0, 0.5).x).toBe(0)
  })

  it('uses contain sizing when requested', () => {
    const contained = createVideoTransform(1920, 1080, 390, 720, false, { objectFit: 'contain' })
    expect(contained.scale).toBeCloseTo(390 / 1920)
    expect(contained.offsetY).toBeGreaterThan(0)
  })
})
