export function Dashboard({ user }: { user: { email: string } }) {
  return <div className="admin-shell">Signed in as {user.email}</div>
}
