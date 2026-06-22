import { useState } from 'react'
import { useContent } from '../lib/useContent'
import './PromoBanner.css'

function dismissKey(text: string) {
  return `pbb-promo-dismissed:${text}`
}

export function PromoBanner() {
  const content = useContent()
  const { promoActive, promoText, promoCode } = content

  const [dismissed, setDismissed] = useState(() => {
    if (!promoText) return false
    try {
      return sessionStorage.getItem(dismissKey(promoText)) === '1'
    } catch {
      return false
    }
  })

  if (!promoActive || !promoText || dismissed) return null

  function dismiss() {
    try {
      sessionStorage.setItem(dismissKey(promoText), '1')
    } catch {
      // sessionStorage unavailable — still dismiss in-memory
    }
    setDismissed(true)
  }

  return (
    <div className="promo-banner" role="banner" aria-label="Promotion">
      <span className="promo-banner__message">
        {promoText}
        {promoCode && (
          <>
            {' '}
            <span className="promo-banner__code">Use code <strong>{promoCode}</strong></span>
          </>
        )}
      </span>
      <button
        type="button"
        className="promo-banner__dismiss"
        onClick={dismiss}
        aria-label="Dismiss promotion"
      >
        ✕
      </button>
    </div>
  )
}
