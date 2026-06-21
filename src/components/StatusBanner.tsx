import type { OpenStatus } from '../lib/openStatus'
import './StatusBanner.css'

export function StatusBanner({ status }: { status: OpenStatus }) {
  if (status.state === 'open') return null
  return (
    <div className="status-banner" role="status" data-state={status.state}>
      {status.label}
    </div>
  )
}
