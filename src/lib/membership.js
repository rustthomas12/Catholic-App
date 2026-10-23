// Read a dashboard-access row, retrying briefly when the request itself
// fails — e.g. right after reopening the app, while an expired session is
// refreshed. Only a successful "no row" means "not an admin"; treating a
// failed request as "no access" bounced real admins to Home.
// query: () => supabase query ending in .maybeSingle()
// Returns { row } (row null = no access) or { error: true }.
export async function readAccess(query, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await query()
    if (!error) return { row: data }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500 * (i + 1)))
  }
  return { error: true }
}
