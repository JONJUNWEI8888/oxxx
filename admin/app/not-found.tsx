import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="admin-backdrop grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-display text-4xl">404</p>
        <p className="mt-3 text-sm text-white/60">没有这个页面</p>
        <Link href="/" className="mt-6 inline-block text-sm text-gold-light">返回</Link>
      </div>
    </div>
  )
}
