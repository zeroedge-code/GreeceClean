import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Login – GreeceClean',
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const hasError = error === '1'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🌿</div>
          <h1 className="text-xl font-bold text-primary">GreeceClean Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Σύνδεση διαχειριστή</p>
        </div>

        <form action="/api/admin/login" method="POST" className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Κωδικός πρόσβασης
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {hasError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Λάθος κωδικός. Δοκιμάστε ξανά.
            </p>
          )}

          <button
            type="submit"
            className="w-full btn-primary py-2 text-sm font-semibold"
          >
            Σύνδεση
          </button>
        </form>
      </div>
    </div>
  )
}
