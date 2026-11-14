import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CircleAlert, RotateCw, Sparkles } from 'lucide-react'
import { useScanner } from '../../hooks/useScanner'
import type { CapturedPortrait, CharacterIdentity } from '../../types/identity'
import { captureCameraPortrait } from '../../services/imageExporter'
import { generateIdentity } from '../../services/identityGenerator'
import { IdentityCard } from '../identity/IdentityCard'
import { ShareControls } from '../identity/ShareControls'
import { CameraPreview } from './CameraPreview'
import { HUD } from './HUD'
import { ScanOverlay } from './ScanOverlay'
import { ScannerControls } from './ScannerControls'

export function Scanner({ onExit }: { onExit: () => void }) {
  const scanner = useScanner()
  const [stage, setStage] = useState<'scanner' | 'completion' | 'dossier'>('scanner')
  const [identity, setIdentity] = useState<CharacterIdentity | null>(null)
  const [portrait, setPortrait] = useState<CapturedPortrait | null>(null)
  const [includeMesh, setIncludeMesh] = useState(true)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const completionTimer = useRef<number | null>(null)
  const generatingRef = useRef(false)
  const retryAll = () => { if (scanner.cameraError) scanner.retryCamera(); else scanner.retry() }
  const visibleError = scanner.cameraError ?? scanner.trackingError

  useEffect(() => () => { if (completionTimer.current !== null) window.clearTimeout(completionTimer.current) }, [])

  function generateDossier() {
    if (generatingRef.current) return
    const video = scanner.videoRef.current
    const landmarks = scanner.landmarksRef.current
    if (!video || !landmarks?.length || scanner.status !== 'tracking') return
    generatingRef.current = true
    try {
      const captured = captureCameraPortrait(video, landmarks, scanner.facing === 'user')
      setPortrait(captured)
      setIdentity(generateIdentity())
      setCaptureError(null)
      scanner.stop()
      setStage('completion')
      completionTimer.current = window.setTimeout(() => setStage('dossier'), 1450)
    } catch {
      generatingRef.current = false
      setCaptureError('We couldn’t capture this frame. Hold still and try again.')
    }
  }

  if (stage === 'dossier' && identity && portrait) {
    return <main className="dossier-page">
      <header className="dossier-page-header"><button className="back-control" type="button" onClick={() => { generatingRef.current = false; setStage('scanner'); setIdentity(null); setPortrait(null) }}><ArrowLeft size={17}/><span>SCAN AGAIN</span></button><div className="brand-lockup"><span className="brand-icon"><Sparkles size={17}/></span><span>JOEY//SCAN</span></div><button className="back-control dossier-exit" type="button" onClick={onExit}>EXIT DOSSIER</button></header>
      <div className="dossier-page-content"><div className="dossier-page-heading"><p className="eyebrow"><i/> OFF-GRID ARCHIVE&nbsp; / &nbsp;ENTRY 01</p><h1>YOUR CHARACTER <em>FILE.</em></h1><p>Fictional attributes, generated at random. No facial analysis or identity matching.</p></div>
        <div className="dossier-layout"><IdentityCard identity={identity} portrait={portrait} includeMesh={includeMesh} onToggleMesh={() => setIncludeMesh(value => !value)}/><aside className="dossier-actions"><p className="actions-eyebrow"><i/> LOCAL GENERATION&nbsp; / &nbsp;READY</p><h2>TRANSMISSION<br/><em>console.</em></h2><ShareControls identity={identity} portrait={portrait} includeMesh={includeMesh}/><p className="dossier-data-note">Camera stopped after capture. Portrait and mesh remain in this session and clear when you leave.</p></aside></div>
      </div>
      <footer className="dossier-page-footer"><span>JOEY LABS&nbsp; · &nbsp;FICTIONAL ENTERTAINMENT</span><span>NO BIOMETRIC IDENTIFICATION</span></footer>
    </main>
  }

  return <main className="scanner-page">
    <header className="scanner-header"><button className="back-control" type="button" onClick={() => { scanner.stop(); onExit() }}><ArrowLeft size={17}/><span>BACK</span></button><div className="brand-lockup"><span className="brand-icon"><Sparkles size={17}/></span><span>JOEY//SCAN</span></div><span className="scanner-index">JOEY LABS &nbsp;·&nbsp; 01</span></header>
    <section className="scanner-main"><div className="scanner-intro"><p className="eyebrow"><i/> PRIVATE FACE TRACKING</p><h1>Look into<br/><em>your own light.</em></h1><p className="scanner-lede">Find a bright spot, hold still for a moment, and let the local face mesh find your signal.</p></div>
      <div className="scanner-stage"><CameraPreview videoRef={scanner.videoRef} landmarksRef={scanner.landmarksRef} subscribe={scanner.subscribe} active={scanner.isReady} mirrored={scanner.facing === 'user'}/>{stage === 'completion' && <div className="completion-overlay" role="status"><div className="completion-crest"><Sparkles size={29}/></div><span>SCAN COMPLETE</span><b>GENERATING FICTIONAL DOSSIER</b><i className="completion-beam"/></div>}</div>
      <div className="scanner-panel"><HUD status={scanner.status} fps={scanner.fps}/>
        {visibleError && <div className="error-panel" role="alert"><CircleAlert size={18}/><span>{visibleError}</span><button type="button" onClick={retryAll} aria-label="Retry"><RotateCw size={17}/></button></div>}
        {scanner.isReady && scanner.status === 'searching' && <p className="face-hint">No face detected yet. Move into the frame and face the light.</p>}
        {scanner.status === 'tracking' && scanner.isReady && <button className="generate-identity-button" type="button" onClick={generateDossier}><Sparkles size={17}/><span>GENERATE IDENTITY</span></button>}
        {captureError && <div className="error-panel" role="alert"><CircleAlert size={18}/><span>{captureError}</span></div>}
        {scanner.status === 'tracking' && <p className="fictional-note">Camera tracking only confirms a face is in frame. It does not determine any dossier attributes.</p>}
        {stage === 'scanner' ? <ScannerControls isReady={scanner.isReady} isStarting={scanner.isStarting} onStart={scanner.start} onStop={scanner.stop} onSwitch={scanner.switchCamera}/> : <p className="completion-copy">Camera paused. Preparing your fictional character file…</p>}
        {stage === 'scanner' && <ScanOverlay/>}
      </div>
    </section>
    <footer className="scanner-footer"><span>LIVE LANDMARKS ARE NEVER SAVED</span><span>JOEY//SCAN &nbsp;·&nbsp; JOEY LABS</span></footer>
  </main>
}
