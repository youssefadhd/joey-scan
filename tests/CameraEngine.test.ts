import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CameraEngine } from '../src/engine/camera/CameraEngine'

function fakeStream() {
  const track = {
    readyState: 'live', stop: vi.fn(), addEventListener: vi.fn(), getSettings: () => ({}),
  }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

function videoElement() {
  const video = document.createElement('video')
  Object.defineProperties(video, {
    readyState: { configurable: true, value: HTMLMediaElement.HAVE_METADATA },
    videoWidth: { configurable: true, value: 1280 },
    videoHeight: { configurable: true, value: 720 },
  })
  vi.spyOn(video, 'play').mockResolvedValue(undefined)
  vi.spyOn(video, 'pause').mockImplementation(() => undefined)
  return video
}

function setMediaDevices(value: Partial<MediaDevices>) {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value })
}

describe('CameraEngine lifecycle', () => {
  let engine: CameraEngine

  beforeEach(() => { engine = new CameraEngine() })
  afterEach(() => { engine.stop(); vi.restoreAllMocks() })

  it('starts the front camera with mobile-friendly constraints and cleans every track on stop', async () => {
    const { stream, track } = fakeStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    setMediaDevices({ getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) })
    const video = videoElement()

    await engine.start(video)

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    const constraints = getUserMedia.mock.calls[0][0] as MediaStreamConstraints
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toMatchObject({
      facingMode: { ideal: 'user' }, width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 },
    })
    expect(video.muted).toBe(true)
    expect(video.playsInline).toBe(true)
    expect(video.autoplay).toBe(true)
    expect(video.srcObject).toBe(stream)

    engine.stop()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(video.srcObject).toBeNull()
    expect(engine.isActive).toBe(false)
  })

  it('switches from front to rear and stops the previous stream first', async () => {
    const first = fakeStream()
    const second = fakeStream()
    const getUserMedia = vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream)
    setMediaDevices({ getUserMedia })
    const video = videoElement()

    await engine.start(video, 'user')
    await engine.switchCamera()

    expect(first.track.stop).toHaveBeenCalledOnce()
    expect(second.track.stop).not.toHaveBeenCalled()
    expect(getUserMedia.mock.calls[1][0].video).toMatchObject({ facingMode: { ideal: 'environment' } })
    expect(video.srcObject).toBe(second.stream)
    expect(engine.currentFacing).toBe('environment')
  })

  it('retries with fewer constraints only for an over-constrained camera', async () => {
    const { stream } = fakeStream()
    const getUserMedia = vi.fn().mockRejectedValueOnce(new DOMException('Unsupported size', 'OverconstrainedError')).mockResolvedValueOnce(stream)
    setMediaDevices({ getUserMedia })

    await engine.start(videoElement(), 'environment')
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(getUserMedia.mock.calls[1][0].video).toEqual({ facingMode: { ideal: 'environment' } })
  })

  it('maps permission denial to a friendly typed error without retrying constraints', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
    setMediaDevices({ getUserMedia })

    await expect(engine.start(videoElement())).rejects.toMatchObject({ code: 'permission-denied' })
    expect(getUserMedia).toHaveBeenCalledOnce()
  })

  it('stops a stream that resolves after its camera request was cancelled', async () => {
    const pending = fakeStream()
    let resolveStream!: (stream: MediaStream) => void
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(resolve => { resolveStream = resolve }))
    setMediaDevices({ getUserMedia })
    const start = engine.start(videoElement())
    engine.stop()
    resolveStream(pending.stream)

    await expect(start).rejects.toMatchObject({ code: 'interrupted' })
    expect(pending.track.stop).toHaveBeenCalledOnce()
  })

  it('reports unsupported camera APIs', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    await expect(engine.start(videoElement())).rejects.toMatchObject({ code: 'unsupported' })
  })
})
