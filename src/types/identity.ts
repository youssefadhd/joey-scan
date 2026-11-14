export type CharacterIdentity = {
  callsign: string
  serialNumber: string
  characterClass: string
  sectorAssignment: string
  clearanceLevel: string
  generationTimestamp: string
  accentDesignation: string
  rarity: IdentityRarity
}

export type IdentityRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type CapturedPortrait = {
  imageDataUrl: string
  meshDataUrl: string | null
}
