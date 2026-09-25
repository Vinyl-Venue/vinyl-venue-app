import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function StarDisplay({ rating }) {
  return (
    <span className="text-accent">
      {'★'.repeat(Math.round(rating))}
      <span className="text-border">{'★'.repeat(5 - Math.round(rating))}</span>
    </span>
  )
}

function ReviewsSection({ sellerId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [sellerId])

  async function fetchReviews() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles!reviews_reviewer_id_fkey(email, display_name)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reviews:', error.message)
      setLoading(false)
      return
    }

    setReviews(data)
    setLoading(false)
  }

  if (loading) return null
  if (reviews.length === 0) {
    return (
      <div className="mb-6 font-sans">
        <div className="bg-text inline-block px-2.5 py-1 mb-2">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Seller reviews</span>
        </div>
        <p className="text-text-muted text-sm">No reviews yet.</p>
      </div>
    )
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return (
    <div className="mb-6 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-2">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Seller reviews</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <StarDisplay rating={averageRating} />
        <span className="text-text-muted text-sm">
          {averageRating.toFixed(1)} ({reviews.length} review{reviews.length === 1 ? '' : 's'})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {reviews.map((review) => (
          <div key={review.id} className="bg-surface border border-border rounded px-4 py-3">
            <div className="flex items-center justify-between">
              <StarDisplay rating={review.rating} />
              <span className="text-text-muted text-xs">{review.profiles?.display_name || review.profiles?.email || 'Someone'}</span>
            </div>
            {review.body && <p className="text-sm text-text mt-1.5 mb-0">{review.body}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReviewsSection