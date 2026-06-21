import type { OpenStatus } from '../lib/openStatus'
import './OrderStatus.css'

export function OrderStatus({ status }: { status: OpenStatus }) {
  return (
    <div className="order-status" data-state={status.state}>
      <span className="order-status__dot" aria-hidden="true" />
      <span className="order-status__label">{status.label}</span>
    </div>
  )
}
