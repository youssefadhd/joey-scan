import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveWasm: vi.fn(),
  createLandmarker: vi.fn(),
  detect: vi.fn(),
  close: vi.fn(),
}))

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mocks.resolveWasm },
  FaceLandmarker: { createFromOptions: mocks.createLandmarker },
}))

import { FaceEngine } from '../src/engine/vision/FaceEngine'

describe('FaceEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveWasm.mockResolvedValue({ wasm: true })
    mocks.createLandmarker.mockResolvedValue({ detectForVideo: mocks.detect, close: mocks.close })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('coalesces concurrent initialization and creates a single VIDEO landmarker', async () => {
    const [one, two] = await Promise.all([FaceEngine.load(), FaceEngine.load()])
    expect(one).toBe(two)
    expect(mocks.resolveWasm).toHaveBeenCalledOnce()
    expect(mocks.resolveWasm).toHaveBeenCalledWith('/wasm')
    expect(mocks.createLandmarker).toHaveBeenCalledOnce()
    expect(mocks.createLandmarker.mock.calls[0][1]).toMatchObject({ runningMode: 'VIDEO', numFaces: 1, outputFacialTransformationMatrixes: true })
    one.close()
  })

  it('uses a CPU delegate when the GPU graph cannot initialize', async () => {
    mocks.createLandmarker.mockRejectedValueOnce(new Error('GPU not supported')).mockResolvedValueOnce({ detectForVideo: mocks.detect, close: mocks.close })
    const engine = await FaceEngine.load()
    expect(mocks.createLandmarker).toHaveBeenCalledTimes(2)
    expect(mocks.createLandmarker.mock.calls[1][1].baseOptions.delegate).toBe('CPU')
    engine.close()
  })

  it('reports a WASM initialization failure', async () => {
    mocks.resolveWasm.mockRejectedValueOnce(new Error('WASM unavailable'))
    await expect(FaceEngine.load()).rejects.toMatchObject({ code: 'wasm-unavailable' })
    expect(mocks.createLandmarker).not.toHaveBeenCalled()
  })

  it('disposes the native task and permits a clean reinitialization', async () => {
    const first = await FaceEngine.load()
    first.close()
    expect(mocks.close).toHaveBeenCalledOnce()
    const second = await FaceEngine.load()
    expect(mocks.createLandmarker).toHaveBeenCalledTimes(2)
    second.close()
  })
})
