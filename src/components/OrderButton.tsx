import './OrderButton.css'

interface OrderButtonProps {
  label: string
  url: string
  variant?: 'solid' | 'ghost'
  disabled?: boolean
}

export function OrderButton({ label, url, variant = 'solid', disabled = false }: OrderButtonProps) {
  if (disabled) {
    return (
      <span className={`order-btn order-btn--${variant} order-btn--disabled`} aria-disabled="true">
        {label}
      </span>
    )
  }
  return (
    <a className={`order-btn order-btn--${variant}`} href={url} target="_blank" rel="noopener noreferrer">
      {label}
      <span className="order-btn__arrow foil" aria-hidden="true">→</span>
    </a>
  )
}
