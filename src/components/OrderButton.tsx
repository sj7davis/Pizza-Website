import './OrderButton.css'

interface OrderButtonProps {
  href: string
  variant?: 'solid' | 'ghost'
}

export function OrderButton({ href, variant = 'solid' }: OrderButtonProps) {
  return (
    <a
      className={`order-btn order-btn--${variant}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      Order on Uber Eats
      <span className="order-btn__arrow foil" aria-hidden="true">→</span>
    </a>
  )
}
