import { ApiError, userMessage } from '@/lib/api/errors'

export function ApiAlert({ error }: { error: ApiError | null }) {
  if (!error) return null
  return (
    <div role="alert" title={error.code} className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
      {userMessage(error)}
    </div>
  )
}

export function StatusNote({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-light">{children}</p>
}
