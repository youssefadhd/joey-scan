import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCamera } from '../src/hooks/useCamera'

function makeStream() {
  const track = { readyState: 'live', stop: vi.fn(), addEventListener: vi.fn() }
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

describe('useCamera lifecycle', () => {
  let root: Root | null = null
  let host: HTMLDivElement | null = null
  afterEach(async () => {
    if (root) await act(async () => root?.unmount())
    root = null
    host?.remove()
    host = null
    vi.restoreAllMocks()
  })

  it('does not request permission on mount and stops the active stream on unmount', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const { stream, track } = makeStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) } })
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    function Probe() {
      const camera = useCamera()
      return createElement('div', null,
        createElement('video', { ref: camera.videoRef }),
        createElement('button', { type: 'button', onClick: () => { void camera.start() } }, 'Start'),
      )
    }

    await act(async () => { root?.render(createElement(Probe)) })
    expect(getUserMedia).not.toHaveBeenCalled()
    const video = host?.querySelector('video')
    if (video) {
      vi.spyOn(video, 'play').mockResolvedValue(undefined)
      vi.spyOn(video, 'pause').mockImplementation(() => undefined)
    }
    await act(async () => { host?.querySelector('button')?.click() })
    expect(getUserMedia).toHaveBeenCalledOnce()

    await act(async () => { root?.unmount() })
    root = null
    expect(track.stop).toHaveBeenCalledOnce()
  })
})
