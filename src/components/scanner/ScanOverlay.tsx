import { Fingerprint, ShieldCheck } from 'lucide-react'

export function ScanOverlay() {
  return <div className="privacy-note-card"><div className="privacy-symbol"><ShieldCheck size={18}/><Fingerprint size={16}/></div><p><b>Private by nature.</b><br/>Video and facial landmarks stay on this device and are never stored. MediaPipe sends limited runtime metrics, without images or landmarks.</p></div>
}
