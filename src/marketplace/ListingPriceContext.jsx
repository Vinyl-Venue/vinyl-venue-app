import { useEffect, useState } from 'react'
import { loadGradeStats, gradeRow, money } from './marketData'
import GradingAccuracyLine from '../GradingAccuracyLine'
import { loadGradingAccuracy } from '../sellerTrust'
import GradePriceTable from './GradePriceTable'

// Under a listing's price: the delivered total, how it compares with what this pressing sells for
// at this grade here, and how accurately this seller grades. Every number says what it rests on.
function ListingPriceContext({ listing, price, shippingPrice, isAuction }) {
  const [stats, setStats] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [showTable, setShowTable] = useState(false)
  const rid = listing.discogsReleaseId

  useEffect(() => {
    let cancelled = false
    setStats(null)
    if (rid) loadGradeStats(rid).then((s) => { if (!cancelled) setStats(s) })
    return () => { cancelled = true }
  }, [rid])

  useEffect(() => {
    let cancelled = false
    setAccuracy(null)
    loadGradingAccuracy(listing.userId).then((a) => { if (!cancelled) setAccuracy(a) })
    return () => { cancelled = true }
  }, [listing.userId])

  const delivered = shippingPrice != null ? Number(price) + Number(shippingPrice) : null
  const row = gradeRow(stats, listing.mediaCondition)
  const typical = row ? (row.estimate_delivered ?? null) : null
  const diff = delivered != null && typical != null && row.sales > 0 ? Math.round((delivered / typical - 1) * 100) : null

  return (
    <div className="font-sans mt-1.5 flex flex-col gap-1">
      {delivered != null && !isAuction && (
        <p className="m-0 text-xs text-text">Delivered total: <strong>{money(delivered)}</strong></p>
      )}
      {row && row.sales > 0 && typical != null && !isAuction && (
        <p className="m-0 text-xs text-text-muted">
          Typical for {row.grade} here: {money(typical)} delivered ({row.confidence} confidence, {row.sales} sale{row.sales === 1 ? '' : 's'})
          {diff != null && Math.abs(diff) >= 5 && (
            <span className={diff < 0 ? 'text-[#4f7a56]' : 'text-[#c1666b]'}> · {Math.abs(diff)}% {diff < 0 ? 'below' : 'above'}</span>
          )}
        </p>
      )}
      <GradingAccuracyLine accuracy={accuracy} />
      {stats && stats.grades?.length > 0 && (
        <>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="self-start bg-transparent border-0 p-0 text-xs text-accent cursor-pointer">
            {showTable ? 'Hide price by grade' : 'Price by grade for this pressing'}
          </button>
          {showTable && <GradePriceTable stats={stats} highlightGrade={listing.mediaCondition} />}
        </>
      )}
    </div>
  )
}

export default ListingPriceContext
