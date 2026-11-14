import { ScanFace, Sparkles } from 'lucide-react'
import type { CapturedPortrait, CharacterIdentity } from '../../types/identity'
import { IdentityDetails } from './IdentityDetails'

type IdentityCardProps = {
  identity: CharacterIdentity
  portrait: CapturedPortrait
  includeMesh: boolean
  onToggleMesh: () => void
}

export function IdentityCard({ identity, portrait, includeMesh, onToggleMesh }: IdentityCardProps) {
  return <article className="dossier-card">
    <header className="dossier-topline"><div className="dossier-brand"><ScanFace size={20}/><span>JOEY//SCAN</span></div><span className="dossier-origin">A JOEY LABS CHARACTER FILE</span><span className="dossier-index"><i/> ARCHIVE / 01</span></header>
    <div className="dossier-content">
      <figure className="dossier-portrait">
        <img className="portrait-photo" src={portrait.imageDataUrl} alt="Portrait captured from your camera" />
        {includeMesh && portrait.meshDataUrl && <img className="portrait-mesh" src={portrait.meshDataUrl} alt="" aria-hidden="true"/>}
        <div className="portrait-crosshair" aria-hidden="true"><i/><i/><i/><i/></div>
        <figcaption><span>USER-PROVIDED CAPTURE</span><span>{includeMesh && portrait.meshDataUrl ? 'MESH / ON' : 'MESH / OFF'}</span></figcaption>
      </figure>
      <div className="dossier-info">
        <div className="dossier-classification"><Sparkles size={14}/><span>FICTIONAL SUBJECT PROFILE</span><span className={`rarity-chip rarity-${identity.rarity.toLowerCase()}`}><i/> {identity.rarity}</span></div>
        <p className="callsign-label">CALLSIGN</p>
        <h1 className="dossier-callsign">{identity.callsign}</h1>
        <p className="dossier-serial"><span>SUBJECT SERIAL</span><b>{identity.serialNumber}</b></p>
        <IdentityDetails identity={identity}/>
        <button className="mesh-toggle" type="button" role="switch" aria-checked={includeMesh} onClick={onToggleMesh}><span className={`toggle-indicator${includeMesh ? ' is-on' : ''}`} /> CYAN LANDMARK MESH <small>{includeMesh ? 'ON' : 'OFF'}</small></button>
      </div>
    </div>
    <footer className="dossier-footer"><span>ALL ATTRIBUTES ARE RANDOM + FICTIONAL</span><span>NO FACE RECOGNITION&nbsp; · &nbsp;NO IDENTITY MATCHING</span><b>JOEY LABS <i>✳</i></b></footer>
  </article>
}
