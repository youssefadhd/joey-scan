import type { CharacterIdentity, IdentityRarity } from '../types/identity'

const callsigns = ['NIGHT SHIFT', 'STATIC BLOOM', 'ZERO HOUR', 'GHOST SIGNAL', 'LUCID RIOT', 'NEON NOMAD', 'SOFT ERROR', 'STAR WRAITH', 'ECHO VECTOR', 'VELVET CIRCUIT', 'DUSK RUNNER', 'PIXEL SAINT']
const characterClasses = ['Signal Runner', 'Archive Diver', 'Ghost Courier', 'Neon Cartographer', 'Circuit Warden', 'Afterlight Drifter', 'Static Alchemist', 'Skyline Scout']
const sectors = ['LOWER HALO', 'SECTOR 09 / GLASSLINE', 'NIGHT MARKET / EAST', 'THE QUIET GRID', 'UPPER STATIC', 'OLD ORBIT / SOUTH', 'AFTERLIGHT DISTRICT', 'RUST GARDEN / 04']
const clearances = ['C-01 · WAYFARER', 'C-02 · NIGHT ACCESS', 'C-03 · GHOST KEY', 'C-04 · DEEP SIGNAL', 'C-05 · OFF-GRID']
const accents = ['ION CYAN / 07', 'AFTERGLOW VIOLET / 12', 'PHOTON RED / 03', 'GLITCH MINT / 09', 'NOVA AMBER / 14', 'PLASMA BLUE / 02']
const rarities: IdentityRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY']
let serialSequence = 0

export type IdentityGeneratorOptions = {
  now?: Date
  random?: () => number
}

function randomUnit(): number {
  const cryptoObject = globalThis.crypto
  if (cryptoObject?.getRandomValues) {
    try {
      const value = new Uint32Array(1)
      cryptoObject.getRandomValues(value)
      return value[0] / 0x1_0000_0000
    } catch { return Math.random() }
  }
  return Math.random()
}

function pick<T>(items: readonly T[], random: () => number): T {
  const bounded = Math.max(0, Math.min(0.999999999, random()))
  return items[Math.floor(bounded * items.length)]
}

/** Generates a fictional dossier from random tables only. It intentionally accepts no face data. */
export function generateIdentity(options: IdentityGeneratorOptions = {}): CharacterIdentity {
  const now = options.now ?? new Date()
  const random = options.random ?? randomUnit
  serialSequence += 1
  const dateCode = now.toISOString().slice(2, 10).replace(/-/g, '')
  const randomCode = Array.from({ length: 3 }, () => Math.floor(Math.max(0, Math.min(0.999999999, random())) * 0x1_0000)
    .toString(16).padStart(4, '0').toUpperCase()).join('')
  const sequenceCode = serialSequence.toString(36).toUpperCase().padStart(3, '0')

  return {
    callsign: pick(callsigns, random),
    serialNumber: `JS-${dateCode}-${randomCode}-${sequenceCode}`,
    characterClass: pick(characterClasses, random),
    sectorAssignment: pick(sectors, random),
    clearanceLevel: pick(clearances, random),
    generationTimestamp: now.toISOString(),
    accentDesignation: pick(accents, random),
    rarity: pick(rarities, random),
  }
}
