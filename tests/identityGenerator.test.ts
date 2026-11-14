import { describe, expect, it } from 'vitest'
import { generateIdentity } from '../src/services/identityGenerator'

describe('fictional identity generation', () => {
  const now = new Date('2026-11-14T08:15:30.000Z')

  it('generates only fictional dossier fields from random tables', () => {
    const identity = generateIdentity({ now, random: () => 0.42 })
    expect(identity).toMatchObject({
      callsign: expect.any(String), serialNumber: expect.stringMatching(/^JS-261114-[A-F0-9]{12}-[A-Z0-9]{3,}$/),
      characterClass: expect.any(String), sectorAssignment: expect.any(String), clearanceLevel: expect.any(String),
      generationTimestamp: now.toISOString(), accentDesignation: expect.any(String), rarity: expect.stringMatching(/^(COMMON|RARE|EPIC|LEGENDARY)$/),
    })
    expect(Object.keys(identity).sort()).toEqual([
      'accentDesignation', 'callsign', 'characterClass', 'clearanceLevel', 'generationTimestamp', 'rarity', 'sectorAssignment', 'serialNumber',
    ])
    expect(identity.rarity).toBe('RARE')
  })

  it('creates unique serial numbers for identities generated in the same instant', () => {
    const options = { now, random: () => 0.5 }
    const first = generateIdentity(options)
    const second = generateIdentity(options)
    expect(first.serialNumber).not.toBe(second.serialNumber)
  })

  it('keeps every generated value inside the fictional data catalog', () => {
    const identity = generateIdentity({ now, random: () => 0.999 })
    expect(identity.callsign).toBe('PIXEL SAINT')
    expect(identity.characterClass).toBe('Skyline Scout')
    expect(identity.sectorAssignment).toBe('RUST GARDEN / 04')
    expect(identity.clearanceLevel).toBe('C-05 · OFF-GRID')
    expect(identity.accentDesignation).toBe('PLASMA BLUE / 02')
    expect(identity.rarity).toBe('LEGENDARY')
  })
})
