import type { RefObject } from 'react'
import { FaceMesh } from './FaceMesh'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { videoProjectionStyle } from '../../engine/graphics/VideoTransform'

type CameraPreviewProps = {
  videoRef: RefObject<HTMLVideoElement>
  landmarksRef: RefObject<NormalizedLandmark[] | null>
  subscribe: (listener: () => void) => () => void
  active: boolean
  mirrored: boolean
}

export function CameraPreview({ videoRef, landmarksRef, subscribe, active, mirrored }: CameraPreviewProps) {
  return <div className={`camera-preview${active ? ' is-active' : ''}`}>
    <video ref={videoRef} className="camera-video" style={videoProjectionStyle(mirrored)} muted autoPlay playsInline aria-label="Live camera preview" />
    <FaceMesh videoRef={videoRef} landmarksRef={landmarksRef} subscribe={subscribe} mirrored={mirrored} active={active} />
    {!active && <div className="preview-placeholder"><span className="preview-reticle">◉</span><span>YOUR PREVIEW APPEARS HERE</span></div>}
    <div className="preview-corners" aria-hidden="true"><i/><i/><i/><i/></div>
    <div className="preview-readout"><span><i className={active ? 'signal-dot live' : 'signal-dot'}/>{active ? 'LOCAL TRACKING' : 'CAMERA STANDBY'}</span><span>JOEY LABS&nbsp; / &nbsp;01</span></div>
  </div>
}
