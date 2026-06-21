export type OrderState = 'open' | 'closed' | 'soldout'

export interface OpenStatus {
  state: OrderState
  label: string
  /** Minutes until the next state change (close when open, open when closed). */
  minutesUntilChange: number
}

interface Args {
  now: Date
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return h * 60 + m
}

/** "21:00" -> "9pm", "17:00" -> "5pm", "17:30" -> "5:30pm" */
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`
}

export function computeOpenStatus(args: Args): OpenStatus {
  if (args.soldOut) {
    return { state: 'soldout', label: args.soldOutMessage, minutesUntilChange: 0 }
  }
  const cur = localMinutes(args.now, args.timezone)
  const open = toMinutes(args.openTime)
  const close = toMinutes(args.closeTime)

  if (cur >= open && cur < close) {
    return {
      state: 'open',
      label: `Open now — ordering till ${prettyTime(args.closeTime)}`,
      minutesUntilChange: close - cur,
    }
  }
  const minsToOpen = cur < open ? open - cur : 24 * 60 - cur + open
  return {
    state: 'closed',
    label: `Opens at ${prettyTime(args.openTime)}`,
    minutesUntilChange: minsToOpen,
  }
}
