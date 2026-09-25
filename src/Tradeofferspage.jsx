import { useState, useEffect } from 'react'
import Header from './Header'
import AddToShelfPrompt from './AddToShelfPrompt'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'

const STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  cancelled: 'Cancelled'
}

function TradeOffersPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('received')
  const [receivedOffers, setReceivedOffers] = useState([])
  const [sentOffers, setSentOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingOnId, setActingOnId] = useState(null)
  const [activePrompt, setActivePrompt] = useState(null)

  useEffect(() => {
    loadOffers()
  }, [])

  async function loadOffers() {
    setLoading(true)

    const { data: received, error: receivedError } = await supabase
      .from('trade_offers')
      .select('*, listings(*), trade_offer_items(*, albums(*)), offerer:profiles!trade_offers_offerer_id_fkey(*)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (receivedError) {
      console.error('Error loading received trade offers:', receivedError.message)
    } else {
      setReceivedOffers(received || [])
    }

    const { data: sent, error: sentError } = await supabase
      .from('trade_offers')
      .select('*, listings(*), trade_offer_items(*, albums(*)), seller:profiles!trade_offers_seller_id_fkey(*)')
      .eq('offerer_id', user.id)
      .order('created_at', { ascending: false })

    if (sentError) {
      console.error('Error loading sent trade offers:', sentError.message)
    } else {
      setSentOffers(sent || [])
    }

    setLoading(false)
  }

  async function handleAccept(offer) {
    setActingOnId(offer.id)

    const { error } = await supabase
      .from('trade_offers')
      .update({ status: 'accepted' })
      .eq('id', offer.id)

    setActingOnId(null)

    if (error) {
      console.error('Error accepting trade offer:', error.message)
      return
    }

    await loadOffers()

    if (offer.trade_offer_items?.length > 0) {
      setActivePrompt({ side: 'seller', offerId: offer.id, itemIndex: 0, items: offer.trade_offer_items })
    }
  }

  async function handleDecline(offerId) {
    setActingOnId(offerId)

    const { error } = await supabase
      .from('trade_offers')
      .update({ status: 'declined' })
      .eq('id', offerId)

    setActingOnId(null)

    if (error) {
      console.error('Error declining trade offer:', error.message)
      return
    }

    await loadOffers()
  }

  async function handleSellerPromptDone() {
    if (!activePrompt) return

    const nextIndex = activePrompt.itemIndex + 1
    if (nextIndex < activePrompt.items.length) {
      setActivePrompt({ ...activePrompt, itemIndex: nextIndex })
      return
    }

    await supabase
      .from('trade_offers')
      .update({ seller_shelf_prompt_shown: true })
      .eq('id', activePrompt.offerId)

    setActivePrompt(null)
    loadOffers()
  }

  async function handleOffererPromptDone(offerId) {
    await supabase
      .from('trade_offers')
      .update({ offerer_shelf_prompt_shown: true })
      .eq('id', offerId)

    setActivePrompt(null)
    loadOffers()
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-5 lg:px-10 pb-24 lg:pb-10"><p>Loading...</p></section>
      </>
    )
  }

  const pendingReceivedCount = receivedOffers.filter((o) => o.status === 'pending').length

  return (
    <>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-10 restores
          normal desktop spacing. */}
      <section className="px-5 lg:px-10 pb-24 lg:pb-10 max-w-2xl">
        <h2 className="text-2xl font-serif mb-4">Trade offers</h2>

        <div className="flex gap-2 mb-5 font-sans">
          <button
            onClick={() => setTab('received')}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
              tab === 'received' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
            }`}
          >
            Received{pendingReceivedCount > 0 ? ` (${pendingReceivedCount})` : ''}
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer ${
              tab === 'sent' ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
            }`}
          >
            Sent
          </button>
        </div>

        {tab === 'received' ? (
          receivedOffers.length === 0 ? (
            <p className="text-text-muted font-sans text-sm">No trade offers yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {receivedOffers.map((offer) => {
                const showSellerPrompt =
                  offer.status === 'accepted' &&
                  !offer.seller_shelf_prompt_shown &&
                  activePrompt?.side === 'seller' &&
                  activePrompt?.offerId === offer.id

                return (
                  <div key={offer.id} className="bg-surface border border-border rounded-lg p-4 font-sans">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <p className="text-sm text-text m-0">
                        <strong>{displayNameFor(offer.offerer)}</strong> wants{' '}
                        <strong>{offer.listings?.title}</strong>
                      </p>
                      <span className="text-[10px] uppercase tracking-wider text-text-faint">
                        {STATUS_LABELS[offer.status]}
                      </span>
                    </div>

                    <p className="text-xs text-text-faint uppercase tracking-wider mb-1.5">Offering</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(offer.trade_offer_items || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5">
                          <img
                            src={item.albums?.image_url || avatarPlaceholder(28)}
                            alt=""
                            className="w-7 h-7 object-cover rounded flex-shrink-0"
                          />
                          <span className="text-xs text-text">
                            {item.albums?.title} — {item.albums?.artist}
                          </span>
                        </div>
                      ))}
                    </div>

                    {offer.message && (
                      <p className="text-xs text-text-muted italic mb-2">"{offer.message}"</p>
                    )}

                    {offer.status === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleAccept(offer)}
                          disabled={actingOnId === offer.id}
                          className="flex-1 bg-accent text-bg font-bold text-xs py-1.5 rounded cursor-pointer disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(offer.id)}
                          disabled={actingOnId === offer.id}
                          className="flex-1 bg-transparent border border-border text-text-muted font-bold text-xs py-1.5 rounded cursor-pointer disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {showSellerPrompt && (
                      <div className="mt-3">
                        <AddToShelfPrompt
                          item={{
                            title: activePrompt.items[activePrompt.itemIndex].albums.title,
                            artist: activePrompt.items[activePrompt.itemIndex].albums.artist,
                            imageUrl: activePrompt.items[activePrompt.itemIndex].albums.image_url
                          }}
                          userId={user.id}
                          onDone={handleSellerPromptDone}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : sentOffers.length === 0 ? (
          <p className="text-text-muted font-sans text-sm">You haven't proposed any trades yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sentOffers.map((offer) => {
              const needsOffererPrompt = offer.status === 'accepted' && !offer.offerer_shelf_prompt_shown

              return (
                <div key={offer.id} className="bg-surface border border-border rounded-lg p-4 font-sans">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm text-text m-0">
                      Your offer to <strong>{displayNameFor(offer.seller)}</strong> for{' '}
                      <strong>{offer.listings?.title}</strong>
                    </p>
                    <span className="text-[10px] uppercase tracking-wider text-text-faint">
                      {STATUS_LABELS[offer.status]}
                    </span>
                  </div>

                  <p className="text-xs text-text-faint uppercase tracking-wider mb-1.5">You offered</p>
                  <div className="flex flex-wrap gap-2">
                    {(offer.trade_offer_items || []).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5">
                        <img
                          src={item.albums?.image_url || avatarPlaceholder(28)}
                          alt=""
                          className="w-7 h-7 object-cover rounded flex-shrink-0"
                        />
                        <span className="text-xs text-text">
                          {item.albums?.title} — {item.albums?.artist}
                        </span>
                      </div>
                    ))}
                  </div>

                  {needsOffererPrompt && (
                    <div className="mt-3">
                      <AddToShelfPrompt
                        item={{
                          title: offer.listings?.title,
                          artist: offer.listings?.artist,
                          year: offer.listings?.year,
                          genre: offer.listings?.genre,
                          imageUrl: offer.listings?.image_url,
                          sleeveCondition: offer.listings?.sleeve_condition,
                          mediaCondition: offer.listings?.media_condition,
                          label: offer.listings?.label,
                          pressingCountry: offer.listings?.pressing_country
                        }}
                        userId={user.id}
                        onDone={() => handleOffererPromptDone(offer.id)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

export default TradeOffersPage