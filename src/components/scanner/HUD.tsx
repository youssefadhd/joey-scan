import { Activity, ScanFace } from 'lucide-react'
import type { FaceTrackingStatus } from '../../types/scanner'

const labels: Record<FaceTrackingStatus, string> = {
  idle: 'STANDBY', loading: 'LOADING ENGINE', searching: 'LOOKING FOR A FACE', tracking: 'FACE LOCKED', error: 'TRACKING PAUSED',
}

export function HUD({ status, fps }: { status: FaceTrackingStatus; fps: number }) {
  return <div className="tracking-hud" aria-live="polite">
    <div className="hud-icon">{status === 'tracking' ? <Activity size={15}/> : <ScanFace size={15}/>}</div>
    <div className="hud-copy"><span>{labels[status]}</span><small>{status === 'tracking' ? 'LANDMARKS LIVE · ON DEVICE' : status === 'searching' ? 'CENTER YOUR FACE IN THE FRAME' : status === 'error' ? 'CHECK STATUS BELOW' : 'PRIVATE BY DESIGN'}</small></div>
    <div className={`hud-fps${fps < 12 && status === 'tracking' ? ' is-slow' : ''}`}><b>{fps || '—'}</b><small>FPS</small></div>
  </div>
}
