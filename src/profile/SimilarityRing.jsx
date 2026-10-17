function SimilarityRing({ score }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
      <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
      <circle
        cx="55" cy="55" r={radius} fill="none" stroke="var(--color-accent)" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="51" textAnchor="middle" fontSize="22" fill="var(--color-text)" fontFamily="Georgia, serif" fontStyle="italic">{score}%</text>
      <text x="55" y="68" textAnchor="middle" fontSize="9.5" fill="var(--color-text-muted)" fontFamily="sans-serif">similar</text>
    </svg>
  )
}

export default SimilarityRing
