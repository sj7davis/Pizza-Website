interface DataPoint {
  date: string
  count: number
}

interface MiniBarChartProps {
  data: DataPoint[]
  height?: number
}

function fmtDate(iso: string): string {
  // e.g. "2026-06-23" → "Jun 23"
  const [, m, d] = iso.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`
}

export function MiniBarChart({ data, height = 120 }: MiniBarChartProps) {
  const n = data.length
  const maxCount = n > 0 ? Math.max(...data.map((d) => d.count)) : 0
  const totalInWindow = data.reduce((s, d) => s + d.count, 0)

  const PAD_LEFT = 28
  const PAD_RIGHT = 8
  const PAD_TOP = 12
  const PAD_BOTTOM = 24
  const W = 600
  const H = height

  const chartW = W - PAD_LEFT - PAD_RIGHT
  const chartH = H - PAD_TOP - PAD_BOTTOM

  const barWidth = n > 0 ? chartW / n : chartW
  const gap = Math.max(1, barWidth * 0.15)

  // x-axis labels: first, middle, last
  const labelIndices: number[] = n > 0 ? [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i) : []

  const ariaLabel =
    n === 0
      ? 'Order clicks per day — no data'
      : `Order clicks per day, last ${n} days, ${totalInWindow} total, peak ${maxCount}`

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* baseline */}
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP + chartH}
        x2={PAD_LEFT + chartW}
        y2={PAD_TOP + chartH}
        stroke="var(--muted)"
        strokeWidth={1}
        opacity={0.4}
      />

      {/* max count label */}
      {maxCount > 0 && (
        <text
          x={PAD_LEFT - 4}
          y={PAD_TOP + 4}
          textAnchor="end"
          fontSize={9}
          fill="var(--muted)"
          fontFamily="inherit"
        >
          {maxCount}
        </text>
      )}

      {/* bars */}
      {data.map((point, i) => {
        const barH = maxCount > 0 ? (point.count / maxCount) * chartH : 0
        const x = PAD_LEFT + i * barWidth + gap / 2
        const w = barWidth - gap
        const y = PAD_TOP + chartH - barH
        return (
          <rect
            key={point.date}
            x={x}
            y={barH > 0 ? y : PAD_TOP + chartH - 1}
            width={Math.max(w, 1)}
            height={barH > 0 ? barH : 1}
            fill={barH > 0 ? 'var(--gold)' : 'var(--muted)'}
            opacity={barH > 0 ? 0.9 : 0.2}
            rx={1}
          >
            <title>{`${point.date}: ${point.count} click${point.count === 1 ? '' : 's'}`}</title>
          </rect>
        )
      })}

      {/* x-axis date labels */}
      {labelIndices.map((i) => {
        const point = data[i]
        if (!point) return null
        const x = PAD_LEFT + i * barWidth + barWidth / 2
        return (
          <text
            key={point.date}
            x={x}
            y={PAD_TOP + chartH + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--muted)"
            fontFamily="inherit"
          >
            {fmtDate(point.date)}
          </text>
        )
      })}
    </svg>
  )
}
