import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CapturedPortrait, CharacterIdentity } from '../src/types/identity'
import { createIdentityCardPng } from '../src/services/imageExporter'

const identity: CharacterIdentity = {
  callsign: 'STAR WRAITH', serialNumber: 'JS-261114-A12F-001', characterClass: 'Ghost Courier',
  sectorAssignment: 'LOWER HALO', clearanceLevel: 'C-03 · GHOST KEY',
  generationTimestamp: '2026-11-14T08:15:30.000Z', accentDesignation: 'ION CYAN / 07', rarity: 'EPIC',
}
const portrait: CapturedPortrait = {
  imageDataUrl: 'data:image/jpeg;base64,portrait', meshDataUrl: 'data:image/png;base64,mesh',
}

function canvasHarness(contextAvailable = true) {
  const gradient = { addColorStop: vi.fn() }
  const context = {
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(),
    fillText: vi.fn(), measureText: vi.fn((text: string) => ({ width: text.length * 12 })),
    createRadialGradient: vi.fn(() => gradient), createLinearGradient: vi.fn(() => gradient),
    drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), rect: vi.fn(), clip: vi.fn(), strokeRect: vi.fn(),
  }
  const canvas = {
    width: 0, height: 0,
    getContext: vi.fn(() => contextAvailable ? context : null),
    toBlob: vi.fn((callback: BlobCallback) => callback(new Blob(['standalone-png'], { type: 'image/png' }))),
  } as unknown as HTMLCanvasElement
  return { canvas, context }
}

class MockImage {
  width = 800
  height = 1000
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_value: string) { queueMicrotask(() => this.onload?.()) }
}

describe('standalone PNG export', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('renders the dossier into a high-resolution standalone PNG canvas', async () => {
    const { canvas, context } = canvasHarness()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => tagName === 'canvas' ? canvas : originalCreateElement(tagName)) as typeof document.createElement)
    vi.stubGlobal('Image', MockImage)

    const blob = await createIdentityCardPng(identity, portrait, true)

    expect(canvas.width).toBe(1800)
    expect(canvas.height).toBe(1350)
    expect(blob.type).toBe('image/png')
    expect(context.drawImage).toHaveBeenCalledTimes(2)
    expect(context.fillText).toHaveBeenCalledWith('JOEY//SCAN', 76, 82)
    expect(context.fillText).toHaveBeenCalledWith(expect.stringContaining('STAR WRAITH'), expect.any(Number), expect.any(Number), expect.any(Number))
    expect(context.fillText).toHaveBeenCalledWith('CLASSIFICATION', expect.any(Number), expect.any(Number))
    expect(context.fillText).toHaveBeenCalledWith('✦  EPIC  ✦', expect.any(Number), expect.any(Number))
    expect(context.fillText).toHaveBeenCalledWith('NOT A BIOMETRIC PROFILE', expect.any(Number), expect.any(Number))
  })

  it('exports without the optional mesh layer', async () => {
    const { canvas, context } = canvasHarness()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => tagName === 'canvas' ? canvas : originalCreateElement(tagName)) as typeof document.createElement)
    vi.stubGlobal('Image', MockImage)

    await createIdentityCardPng(identity, portrait, false)
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(context.fillText).toHaveBeenCalledWith('LANDMARK MESH  /  OFF', 820, 1207)
    expect(context.fillText).toHaveBeenCalledWith('✦  EPIC  ✦', expect.any(Number), expect.any(Number))
  })

  it('returns a clear failure when canvas rendering is unavailable', async () => {
    const { canvas } = canvasHarness(false)
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => tagName === 'canvas' ? canvas : originalCreateElement(tagName)) as typeof document.createElement)
    vi.stubGlobal('Image', MockImage)

    await expect(createIdentityCardPng(identity, portrait)).rejects.toThrow('PNG export is not supported')
  })
})
