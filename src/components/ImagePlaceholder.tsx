import './ImagePlaceholder.css'

interface ImagePlaceholderProps {
  label?: string
}

export function ImagePlaceholder({ label }: ImagePlaceholderProps) {
  return (
    <div
      className="img-ph"
      role="img"
      aria-label={label ? `${label} — photo coming soon` : 'Photo coming soon'}
    >
      <span className="img-ph__mark foil" aria-hidden="true">PBV</span>
      <span className="img-ph__note" aria-hidden="true">photo coming soon</span>
    </div>
  )
}
