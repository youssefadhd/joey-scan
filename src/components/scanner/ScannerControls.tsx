import { Camera, CameraOff, RefreshCw } from 'lucide-react'

type ScannerControlsProps = {
  isReady: boolean
  isStarting: boolean
  onStart: () => void
  onStop: () => void
  onSwitch: () => void
}

export function ScannerControls({ isReady, isStarting, onStart, onStop, onSwitch }: ScannerControlsProps) {
  if (!isReady) return <button className="control-button primary-control" type="button" onClick={onStart} disabled={isStarting}>
    <Camera size={18}/><span>{isStarting ? 'Connecting…' : 'Enable camera'}</span>
  </button>
  return <div className="controls-row">
    <button className="control-button switch-control" type="button" onClick={onSwitch} aria-label="Switch between front and rear camera"><RefreshCw size={18}/><span>Switch camera</span></button>
    <button className="control-button stop-control" type="button" onClick={onStop}><CameraOff size={18}/><span>Stop camera</span></button>
  </div>
}
