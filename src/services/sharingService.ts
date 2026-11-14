import type { CharacterIdentity } from '../types/identity'
import { downloadPngBlob } from './imageExporter'

export type ShareResult = 'shared' | 'details-shared' | 'copied' | 'downloaded' | 'cancelled'

export function identityShareText(identity: CharacterIdentity): string {
  return `JOEY//SCAN dossier: ${identity.callsign} · ${identity.serialNumber}. Fictional character attributes, generated at random. No biometric identification.`
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export async function shareIdentity(
  identity: CharacterIdentity,
  png: Blob,
): Promise<ShareResult> {
  const text = identityShareText(identity)
  const title = `JOEY//SCAN — ${identity.callsign}`
  const fileName = `joey-scan-${identity.serialNumber.toLowerCase()}.png`

  if (typeof navigator.share === 'function') {
    try {
      if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
        const file = new File([png], fileName, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text })
          return 'shared'
        }
      }
      await navigator.share({ title, text })
      return 'details-shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
    }
  }

  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      return 'copied'
    }
  } catch { /* Fall through to a text copy or a direct PNG download. */ }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return 'copied'
    }
  } catch { /* Clipboard access can be denied outside secure contexts. */ }

  downloadPngBlob(png, identity)
  return 'downloaded'
}
