// Small black tag in the same style as the section tags used across the app.
function TrustedBadge({ className = '' }) {
  return (
    <span
      title="3+ reviews and a 4.5 average or better"
      className={`inline-block bg-text px-1.5 py-0.5 align-middle ${className}`}
    >
      <span className="font-mono text-[9px] tracking-wider uppercase font-bold text-bg">Trusted seller</span>
    </span>
  )
}

export default TrustedBadge