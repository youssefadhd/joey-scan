import { useEffect, useState } from 'react'
import { Check, Download, Share2 } from 'lucide-react'
import type { CapturedPortrait, CharacterIdentity } from '../../types/identity'
import { createIdentityCardPng, downloadPngBlob } from '../../services/imageExporter'
import { shareIdentity } from '../../services/sharingService'

type ShareControlsProps = {
  identity: CharacterIdentity
  portrait: CapturedPortrait
  includeMesh: boolean
}

function ExportPreview({ png }: { png: Blob | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!png) { setPreviewUrl(null); return }
    let url: string
    try { url = URL.createObjectURL(png) } catch { setPreviewUrl(null); return }
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [png])

  return <div className="export-preview-shell">
    <div className="export-preview-meta"><span><i/> OUTPUT PREVIEW</span><b>PNG&nbsp; / &nbsp;1800 × 1350</b></div>
    <div className={`export-preview${previewUrl ? ' is-ready' : ''}`}>
      {previewUrl ? <img src={previewUrl} alt="Preview of the standalone downloadable identity card"/> : <div className="export-preview-loading"><i/><i/><i/></div>}
      <span className="preview-corner tl"/><span className="preview-corner tr"/><span className="preview-corner bl"/><span className="preview-corner br"/>
    </div>
  </div>
}

export function ShareControls({ identity, portrait, includeMesh }: ShareControlsProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [rendered, setRendered] = useState<{ key: string; blob: Blob } | null>(null)
  const renderKey = `${identity.serialNumber}:${includeMesh ? 'mesh' : 'plain'}`
  const png = rendered?.key === renderKey ? rendered.blob : null

  useEffect(() => {
    let active = true
    setRendered(null)
    setMessage('')
    setIsError(false)
    void createIdentityCardPng(identity, portrait, includeMesh).then(blob => {
      if (active) setRendered({ key: renderKey, blob })
    }).catch(() => {
      if (active) { setIsError(true); setMessage('The dossier preview could not be prepared. Try another browser.') }
    })
    return () => { active = false }
  }, [identity, portrait, includeMesh, renderKey])

  async function download() {
    setBusy(true); setIsError(false); setMessage('')
    try {
      if (!png) throw new Error('PNG is still rendering.')
      downloadPngBlob(png, identity)
      setMessage('Your high-resolution dossier is ready.')
    } catch {
      setIsError(true)
      setMessage('The image could not be exported. Try another browser or share option.')
    } finally { setBusy(false) }
  }

  async function share() {
    setBusy(true); setIsError(false); setMessage('')
    try {
      if (!png) throw new Error('PNG is still rendering.')
      const result = await shareIdentity(identity, png)
      if (result === 'shared') setMessage('Dossier shared.')
      else if (result === 'details-shared') setMessage('Dossier details shared. Download the PNG to send the full card image.')
      else if (result === 'copied') setMessage('Dossier details or image copied to your clipboard.')
      else if (result === 'downloaded') setMessage('Sharing is unavailable here; your PNG was downloaded.')
      else setMessage('Share cancelled.')
    } catch {
      setIsError(true)
      setMessage('The dossier could not be shared. You can still download the PNG.')
    } finally { setBusy(false) }
  }

  return <div className="share-controls">
    <ExportPreview png={png}/>
    <button type="button" className="share-button share-primary" onClick={() => void share()} disabled={busy || !png}><Share2 size={17}/><span>{busy ? 'PREPARING…' : png ? 'SHARE DOSSIER' : 'RENDERING CARD…'}</span></button>
    <button type="button" className="share-button share-secondary" onClick={() => void download()} disabled={busy || !png}><Download size={17}/><span>DOWNLOAD PNG</span></button>
    {message && <p className={`share-feedback${isError ? ' is-error' : ''}`} role="status">{!isError && message !== 'Share cancelled.' && <Check size={14}/>} {message}</p>}
    <p className="share-privacy">The card is rendered on this device. Sharing sends the exported card only to the destination you choose.</p>
  </div>
}
