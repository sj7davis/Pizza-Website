import './Logo.css'

interface LogoProps {
  text: string
  /** When true, the gold foil covers the whole mark (use on dark/hero). */
  fullFoil?: boolean
}

export function Logo({ text, fullFoil = false }: LogoProps) {
  const letters = text.split('')
  return (
    <span className="logo" role="img" aria-label={text}>
      {letters.map((ch, i) => (
        <span key={i} className={fullFoil ? 'logo__ch foil' : 'logo__ch'}>
          {ch}
          {i < letters.length - 1 && (
            <span className="logo__dot foil" aria-hidden="true">·</span>
          )}
        </span>
      ))}
    </span>
  )
}
