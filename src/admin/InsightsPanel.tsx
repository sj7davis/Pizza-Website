import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MiniBarChart } from './MiniBarChart'

const DAY_OPTIONS = [7, 30, 90] as const
type DayOption = (typeof DAY_OPTIONS)[number]

export function InsightsPanel() {
  const [days, setDays] = useState<DayOption>(30)
  const summary = trpc.analytics.summary.useQuery()
  const emails = trpc.emails.list.useQuery()
  const series = trpc.analytics.clicksByDay.useQuery({ days })

  const allZero = (series.data ?? []).every((d) => d.count === 0)

  return (
    <section className="admin-panel">
      <h2>Insights</h2>

      {/* Order clicks over time */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Order clicks — last {days} days</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '3px',
                  border: '1px solid var(--gold)',
                  background: days === d ? 'var(--gold)' : 'transparent',
                  color: days === d ? 'var(--bg)' : 'var(--gold)',
                  cursor: 'pointer',
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {series.isLoading && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</p>}
        {!series.isLoading && allZero && (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No clicks yet</p>
        )}
        {!series.isLoading && !allZero && (
          <MiniBarChart data={series.data ?? []} />
        )}
      </div>

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
