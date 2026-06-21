export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

export function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === 'saving') return <span className="admin-muted">Saving…</span>
  if (state.status === 'saved') return <span className="admin-saved">Saved ✓</span>
  if (state.status === 'error') return <span className="admin-error" role="alert">{state.message}</span>
  return null
}
