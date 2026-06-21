import { useEffect, useState } from 'react'
import { computeOpenStatus, type OpenStatus } from './openStatus'
import type { SiteContent } from '../types'

export function useOpenStatus(content: SiteContent): OpenStatus {
  const compute = () =>
    computeOpenStatus({
      now: new Date(),
      openTime: content.openTime,
      closeTime: content.closeTime,
      timezone: content.timezone,
      soldOut: content.soldOut,
      soldOutMessage: content.soldOutMessage,
    })
  const [status, setStatus] = useState<OpenStatus>(compute)
  useEffect(() => {
    const id = setInterval(() => setStatus(compute()), 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.openTime, content.closeTime, content.timezone, content.soldOut, content.soldOutMessage])
  return status
}
