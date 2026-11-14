import { faceRenderer } from '../engine/graphics/FaceRenderer'
import { createVideoTransform, VIDEO_PROJECTION } from '../engine/graphics/VideoTransform'
import type { CapturedPortrait, CharacterIdentity } from '../types/identity'

const EXPORT_WIDTH = 1800
const EXPORT_HEIGHT = 1350

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The portrait image could not be loaded.'))
    image.src = source
  })
}

/** Captures a display-matched in-memory portrait and a separate optional mesh layer. */
export function captureCameraPortrait(
  video: HTMLVideoElement,
  landmarks: NonNullable<import('@mediapipe/tasks-vision').FaceLandmarkerResult['faceLandmarks'][number]>,
  mirrored: boolean,
): CapturedPortrait {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    throw new Error('The camera frame is not ready to capture.')
  }

  const previewRect = video.getBoundingClientRect()
  const width = 1200
  const ratio = previewRect && previewRect.width > 0 && previewRect.height > 0
    ? previewRect.width / previewRect.height
    : 4 / 5
  const height = Math.round(width / ratio)
  const photoCanvas = document.createElement('canvas')
  photoCanvas.width = width
  photoCanvas.height = height
  const context = photoCanvas.getContext('2d')
  if (!context) throw new Error('Portrait capture is not supported by this browser.')

  const transform = createVideoTransform(video.videoWidth, video.videoHeight, width, height, mirrored, VIDEO_PROJECTION)
  context.save()
  if (mirrored) {
    context.translate(width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, transform.offsetX, transform.offsetY, video.videoWidth * transform.scale, video.videoHeight * transform.scale)
  context.restore()

  const meshCanvas = document.createElement('canvas')
  meshCanvas.width = width
  meshCanvas.height = height
  faceRenderer.draw(meshCanvas, video, landmarks, mirrored, { width, height, pixelRatio: 1 })
  return {
    imageDataUrl: photoCanvas.toDataURL('image/jpeg', 0.92),
    meshDataUrl: meshCanvas.toDataURL('image/png'),
  }
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

function fitText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size: number, family: string, weight = 600): void {
  let fitted = size
  context.font = `${weight} ${fitted}px ${family}`
  while (context.measureText(text).width > maxWidth && fitted > 20) {
    fitted -= 2
    context.font = `${weight} ${fitted}px ${family}`
  }
  context.fillText(text, x, y, maxWidth)
}

function drawAttributePanel(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  accent: string,
): void {
  const height = 144
  context.fillStyle = 'rgba(9, 17, 26, .94)'
  context.fillRect(x, y, width, height)
  context.strokeStyle = 'rgba(139, 167, 180, .21)'
  context.lineWidth = 1
  context.strokeRect(x, y, width, height)
  context.fillStyle = accent
  context.fillRect(x, y + 14, 3, height - 28)
  context.fillStyle = '#8BA7B4'
  context.font = '500 16px "Courier New", monospace'
  context.fillText(label, x + 24, y + 40)
  context.fillStyle = accent
  context.fillRect(x + width - 24, y + 23, 6, 6)
  context.fillStyle = '#F0F7FA'
  fitText(context, value, x + 24, y + 91, width - 48, 30, 'Arial, sans-serif', 600)
  context.strokeStyle = 'rgba(0, 245, 255, .15)'
  context.beginPath(); context.moveTo(x + 24, y + 113); context.lineTo(x + width - 24, y + 113); context.stroke()
}

function drawIdentityCanvas(
  context: CanvasRenderingContext2D,
  identity: CharacterIdentity,
  portrait: CapturedPortrait,
  portraitImage: HTMLImageElement,
  meshImage: HTMLImageElement | null,
  includeMesh: boolean,
): void {
  const w = EXPORT_WIDTH
  const h = EXPORT_HEIGHT
  context.fillStyle = '#05070B'
  context.fillRect(0, 0, w, h)
  const atmosphere = context.createRadialGradient(1290, 380, 20, 1290, 380, 1050)
  atmosphere.addColorStop(0, '#142239')
  atmosphere.addColorStop(0.44, '#0B1520')
  atmosphere.addColorStop(1, '#05070B')
  context.fillStyle = atmosphere
  context.fillRect(0, 0, w, h)

  context.strokeStyle = 'rgba(0,245,255,.055)'
  context.lineWidth = 1
  for (let x = 0; x < w; x += 72) { context.beginPath(); context.moveTo(x, 116); context.lineTo(x, h - 84); context.stroke() }
  for (let y = 116; y < h - 84; y += 72) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke() }
  const lightSweep = context.createLinearGradient(720, 0, 1100, 0)
  lightSweep.addColorStop(0, 'rgba(0,245,255,0)')
  lightSweep.addColorStop(0.5, 'rgba(0,245,255,.08)')
  lightSweep.addColorStop(1, 'rgba(0,245,255,0)')
  context.fillStyle = lightSweep
  context.fillRect(710, 116, 390, h - 200)

  context.fillStyle = '#00F5FF'
  context.font = '700 30px Arial, sans-serif'
  context.fillText('JOEY//SCAN', 76, 82)
  context.fillStyle = '#8BA7B4'
  context.font = '500 17px Arial, sans-serif'
  context.fillText('JOEY LABS  /  CHARACTER ARCHIVE', 382, 80)
  context.textAlign = 'right'
  context.fillStyle = '#C8D9E2'
  context.font = '500 15px "Courier New", monospace'
  context.fillText('FICTIONAL IDENTITY  /  01', w - 78, 80)
  context.textAlign = 'left'
  context.strokeStyle = 'rgba(0,245,255,.4)'
  context.beginPath(); context.moveTo(76, 112); context.lineTo(w - 76, 112); context.stroke()

  const photo = { x: 68, y: 150, width: 780, height: 1095 }
  context.save()
  context.beginPath(); context.rect(photo.x, photo.y, photo.width, photo.height); context.clip()
  drawCover(context, portraitImage, photo.x, photo.y, photo.width, photo.height)
  if (includeMesh && meshImage) drawCover(context, meshImage, photo.x, photo.y, photo.width, photo.height)
  const shade = context.createLinearGradient(0, photo.y + 780, 0, photo.y + photo.height)
  shade.addColorStop(0, 'rgba(5,7,11,0)')
  shade.addColorStop(1, 'rgba(5,7,11,.88)')
  context.fillStyle = shade
  context.fillRect(photo.x, photo.y, photo.width, photo.height)
  context.restore()
  context.shadowColor = 'rgba(0,245,255,.32)'
  context.shadowBlur = 28
  context.strokeStyle = '#00F5FF'
  context.lineWidth = 2
  context.strokeRect(photo.x, photo.y, photo.width, photo.height)
  context.shadowBlur = 0
  context.fillStyle = '#00F5FF'
  context.font = '600 15px "Courier New", monospace'
  context.fillText('LIVE CAPTURE  /  USER-PROVIDED', photo.x + 28, photo.y + photo.height - 38)
  context.textAlign = 'right'
  context.fillStyle = '#8BA7B4'
  context.fillText(includeMesh && portrait.meshDataUrl ? 'LANDMARK MESH  /  ON' : 'LANDMARK MESH  /  OFF', photo.x + photo.width - 28, photo.y + photo.height - 38)
  context.textAlign = 'left'

  const x = 902
  const contentWidth = w - x - 74
  const rarityColors: Record<CharacterIdentity['rarity'], string> = {
    COMMON: '#00F5FF', RARE: '#52A8FF', EPIC: '#A855F7', LEGENDARY: '#FF3355',
  }
  const rarityColor = rarityColors[identity.rarity]
  context.fillStyle = '#A855F7'
  context.font = '600 15px "Courier New", monospace'
  context.fillText('SUBJECT CALLSIGN', x, 190)
  context.fillStyle = `${rarityColor}20`
  context.fillRect(w - 74 - 205, 158, 205, 48)
  context.strokeStyle = `${rarityColor}99`
  context.strokeRect(w - 74 - 205, 158, 205, 48)
  context.fillStyle = rarityColor
  context.font = '700 14px "Courier New", monospace'
  context.textAlign = 'center'
  context.fillText(`✦  ${identity.rarity}  ✦`, w - 74 - 102, 188)
  context.textAlign = 'left'
  context.fillStyle = '#F4FAFC'
  fitText(context, identity.callsign, x, 324, contentWidth, 88, 'Arial, sans-serif', 700)
  context.fillStyle = 'rgba(0,245,255,.12)'
  context.fillRect(x, 345, contentWidth, 2)
  context.fillStyle = '#00F5FF'
  context.font = '700 18px "Courier New", monospace'
  context.fillText('SERIAL', x + 20, 405)
  context.fillStyle = '#CDE0E7'
  context.font = '500 20px "Courier New", monospace'
  fitText(context, identity.serialNumber, x + 120, 405, contentWidth - 142, 20, 'Courier New, monospace', 500)
  context.fillStyle = 'rgba(0,245,255,.09)'
  context.fillRect(x, 375, contentWidth, 52)
  context.strokeStyle = 'rgba(0,245,255,.26)'
  context.strokeRect(x, 375, contentWidth, 52)
  // Repaint the serial text above the translucent panel.
  context.fillStyle = '#00F5FF'
  context.fillText('SERIAL', x + 20, 408)
  context.fillStyle = '#CDE0E7'
  context.fillText(identity.serialNumber, x + 120, 408, contentWidth - 142)

  const gap = 18
  const panelWidth = (contentWidth - gap) / 2
  drawAttributePanel(context, 'CLASSIFICATION', identity.characterClass, x, 466, panelWidth, '#00F5FF')
  drawAttributePanel(context, 'SECTOR ASSIGNMENT', identity.sectorAssignment, x + panelWidth + gap, 466, panelWidth, '#A855F7')
  drawAttributePanel(context, 'CLEARANCE LEVEL', identity.clearanceLevel, x, 628, panelWidth, '#FF3355')
  drawAttributePanel(context, 'ACCENT DESIGNATION', identity.accentDesignation, x + panelWidth + gap, 628, panelWidth, '#00F5FF')

  const timestamp = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(identity.generationTimestamp)) + ' UTC'
  context.fillStyle = 'rgba(10,18,28,.94)'
  context.fillRect(x, 800, contentWidth, 88)
  context.strokeStyle = 'rgba(139,167,180,.25)'
  context.strokeRect(x, 800, contentWidth, 88)
  context.fillStyle = '#8BA7B4'
  context.font = '500 14px "Courier New", monospace'
  context.fillText('SCAN TIMESTAMP', x + 21, 832)
  context.fillStyle = '#E7F2F6'
  context.font = '500 20px Arial, sans-serif'
  fitText(context, timestamp, x + 21, 864, contentWidth - 42, 20, 'Arial, sans-serif', 500)

  context.fillStyle = '#A855F7'
  context.font = '600 16px "Courier New", monospace'
  context.fillText('NOT A BIOMETRIC PROFILE', x, 952)
  context.fillStyle = '#8BA7B4'
  context.font = '400 17px Arial, sans-serif'
  context.fillText('All generated attributes are fictional and random.', x, 983)
  context.fillStyle = '#8BA7B4'
  context.font = '500 12px "Courier New", monospace'
  context.fillText('CAMERA USED FOR LIVE CAPTURE ONLY', x, 1035)
  context.fillText('NO IDENTITY MATCHING  /  NO ATTRIBUTE INFERENCE', x, 1057)

  context.strokeStyle = 'rgba(0,245,255,.38)'
  context.beginPath(); context.moveTo(68, h - 66); context.lineTo(w - 68, h - 66); context.stroke()
  context.fillStyle = '#8BA7B4'
  context.font = '500 14px "Courier New", monospace'
  context.fillText('JOEY LABS  ·  FICTIONAL ENTERTAINMENT  ·  NO FACE RECOGNITION', 68, h - 32)
  context.textAlign = 'right'
  context.fillStyle = '#00F5FF'
  context.fillText('ARCHIVE ENTRY / 01', w - 68, h - 32)
  context.textAlign = 'left'

  // Small corner marks read as interface framing without relying on a font or external asset.
  context.strokeStyle = '#00F5FF'
  context.lineWidth = 3
  const corners = [
    [photo.x, photo.y, 34, 34, 1, 1], [photo.x + photo.width, photo.y, 34, 34, -1, 1],
    [photo.x, photo.y + photo.height, 34, 34, 1, -1], [photo.x + photo.width, photo.y + photo.height, 34, 34, -1, -1],
  ]
  for (const [cx, cy, length, , directionX, directionY] of corners) {
    context.beginPath(); context.moveTo(cx, cy + Number(directionY) * Number(length)); context.lineTo(cx, cy); context.lineTo(cx + Number(directionX) * Number(length), cy); context.stroke()
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  if (typeof canvas.toBlob === 'function') {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png'))
  }
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  if (!base64) return Promise.reject(new Error('PNG export failed.'))
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
  return Promise.resolve(new Blob([bytes], { type: 'image/png' }))
}

export async function createIdentityCardPng(identity: CharacterIdentity, portrait: CapturedPortrait, includeMesh = true): Promise<Blob> {
  const [portraitImage, meshImage] = await Promise.all([
    loadImage(portrait.imageDataUrl),
    includeMesh && portrait.meshDataUrl ? loadImage(portrait.meshDataUrl) : Promise.resolve(null),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_WIDTH
  canvas.height = EXPORT_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PNG export is not supported by this browser.')
  drawIdentityCanvas(context, identity, portrait, portraitImage, meshImage, includeMesh)
  return canvasToBlob(canvas)
}

export async function downloadIdentityCard(identity: CharacterIdentity, portrait: CapturedPortrait, includeMesh = true): Promise<void> {
  const blob = await createIdentityCardPng(identity, portrait, includeMesh)
  downloadPngBlob(blob, identity)
}

export function downloadPngBlob(blob: Blob, identity: CharacterIdentity): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `joey-scan-${identity.serialNumber.toLowerCase()}.png`
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
