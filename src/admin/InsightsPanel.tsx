import { trpc } from '../lib/trpc'

export function InsightsPanel() {
  const summary = trpc.analytics.summary.useQuery()
  const emails = trpc.emails.list.useQuery()
  return (
    <section className="admin-panel">
      <h2>Insights</h2>
      <h3>Order clicks — total {summary.data?.total ?? 0}</h3>
      <ul className="admin-list">
        {(summary.data?.byPlatform ?? []).map((p) => (
          <li className="admin-row" key={p.platform}>
            <span className="admin-row-name">{p.platform}</span>
            <span className="admin-row-price">{p.count}</span>
          </li>
        ))}
      </ul>
      <h3>Email list — {emails.data?.length ?? 0} signups</h3>
      <ul className="admin-list">
        {(emails.data ?? []).map((e) => (
          <li className="admin-row" key={e.id}><span className="admin-row-name">{e.email}</span></li>
        ))}
      </ul>
    </section>
  )
}
