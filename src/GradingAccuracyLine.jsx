// "Grades accurately · 100% as described (7 buyer checks)". Says nothing until 3 buyers have answered.
function GradingAccuracyLine({ accuracy, className = '' }) {
  if (!accuracy || !accuracy.confirmations) return null
  if (!accuracy.enough) {
    return <p className={`m-0 text-xs text-text-muted ${className}`}>Grading accuracy: {accuracy.confirmations} buyer check{accuracy.confirmations === 1 ? '' : 's'} so far, not enough to rate yet.</p>
  }
  const warn = accuracy.label === 'Tends to overgrade'
  return (
    <p className={`m-0 text-xs ${className}`}>
      <span className={`font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.5 border mr-1.5 ${warn ? 'text-[#c1666b] border-[#c1666b]' : 'text-text border-border-strong'}`}>{accuracy.label}</span>
      <span className="text-text-muted">{accuracy.as_described_pct}% of grades as described or better ({accuracy.confirmations} buyer checks)</span>
    </p>
  )
}

export default GradingAccuracyLine
