import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Shared wrapper for AlbumModal / ListingModal.
//
// >= lg (1024px): docked panel fixed to the right edge of the viewport.
// No dark backdrop — the wall/grid/board behind it stays fully visible
// and interactive. Closes via the × button, Escape, or clicking outside
// the panel.
//
// < lg: falls back to the original centered overlay with a dark backdrop,
// exactly like every modal in the app already behaves.
//
// Rendered via a portal straight into document.body. Without this, "fixed"
// positioning silently breaks if ANY ancestor between this component and
// the page root has a CSS transform on it (a page-transition wrapper, a
// hover-scale effect, the spinning record-disc logo, etc.) — a transformed
// ancestor becomes the new positioning context, so "fixed" ends up anchored
// to that element's box instead of the actual browser viewport, and the
// panel appears trapped in normal page flow instead of staying pinned in
// place as you scroll. Portaling to document.body sidesteps that entirely.
//
// overlayOnly: skips the wide docked-panel branch entirely, rendering
// nothing at lg+. Used on the Shelf, where ShelfDetailPanel already
// occupies that role in-layout at lg+ — this becomes purely the
// narrow-screen fallback there.
function SidePanel({ onClose, children, width = 460, overlayOnly = false }) {
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    // Mount transform starts off-screen, then flips on the next frame so
    // the transition actually animates instead of snapping into place.
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    function handleClickOutside(event) {
      // Below lg the backdrop div's own onClick already handles this —
      // this listener only needs to act when there's no backdrop, i.e. lg+.
      // In overlayOnly mode there's no wide panel to guard at all, so skip.
      if (!overlayOnly && window.innerWidth >= 1024 && panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const closeButton = (
    <button
      onClick={onClose}
      className="absolute top-3 right-3 bg-bg border border-border rounded-full w-8 h-8 flex items-center justify-center text-text-muted text-lg cursor-pointer hover:border-accent hover:text-accent z-10"
    >
      ×
    </button>
  )

  return createPortal(
    <>
      {/* Narrow screens — unchanged full-screen overlay behavior */}
      <div className="lg:hidden fixed inset-0 bg-black/70 flex items-center justify-center z-[999] p-4" onClick={onClose}>
        <div
          className="bg-surface border border-border rounded-lg relative max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(event) => event.stopPropagation()}
        >
          {closeButton}
          {children}
        </div>
      </div>

      {/* Wide screens — docked panel, pinned to the real viewport thanks to
          the document.body portal, no backdrop, page stays interactive.
          Skipped entirely in overlayOnly mode. */}
      {!overlayOnly && (
        <div
          ref={panelRef}
          className="hidden lg:block fixed top-0 right-0 h-screen max-w-[92vw] bg-surface border-l border-border z-[999] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out"
          style={{ width: `${width}px`, transform: mounted ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {closeButton}
          {children}
        </div>
      )}
    </>,
    document.body
  )
}

export default SidePanel