import type { CharacterIdentity } from '../../types/identity'

export function IdentityDetails({ identity }: { identity: CharacterIdentity }) {
  const generatedAt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(identity.generationTimestamp))
  const details = [
    { label: 'CLASSIFICATION', value: identity.characterClass, accent: 'cyan' },
    { label: 'SECTOR ASSIGNMENT', value: identity.sectorAssignment, accent: 'purple' },
    { label: 'CLEARANCE LEVEL', value: identity.clearanceLevel, accent: 'red' },
    { label: 'ACCENT DESIGNATION', value: identity.accentDesignation, accent: 'cyan' },
    { label: 'SCAN TIMESTAMP', value: generatedAt, accent: 'muted' },
  ]
  return <dl className="identity-details">
    {details.map(detail => <div className="identity-detail" key={detail.label}>
      <dt><i aria-hidden="true"/>{detail.label}</dt><dd className={`detail-${detail.accent}`}>{detail.value}</dd>
    </div>)}
  </dl>
}
