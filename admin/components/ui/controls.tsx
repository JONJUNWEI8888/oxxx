import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'h-10 border-transparent bg-gold text-black hover:bg-gold-light',
        ghost: 'h-10 border-line bg-transparent text-foreground hover:border-gold/50 hover:text-gold-light',
        danger: 'h-10 border-down/40 bg-down/10 text-down hover:bg-down/20',
        quiet: 'h-8 border-transparent bg-transparent px-2 text-white/70 hover:text-gold-light',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

export function Button({
  className,
  variant,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />
}

const fieldClass =
  'h-11 w-full rounded-lg border border-line bg-raised px-3 text-sm outline-none transition-colors placeholder:text-white/30 focus:border-gold/70'

export function TextField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />
}

export function SelectField({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, 'pr-8', className)} {...props} />
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'h-auto min-h-24 py-2', className)} {...props} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-xs tracking-wide text-white/70">
      <span>{label}</span>
      {children}
      {hint ? <span className="font-normal tracking-normal text-white/40">{hint}</span> : null}
    </label>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-wide">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}

const pillClass: Record<string, string> = {
  active: 'bg-up/15 text-up',
  approved: 'bg-up/15 text-up',
  frozen: 'bg-gold/15 text-gold-light',
  pending: 'bg-gold/15 text-gold-light',
  banned: 'bg-down/15 text-down',
  rejected: 'bg-down/15 text-down',
}

export function StatusPill({ value, label }: { value: string; label: string }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs', pillClass[value] ?? 'bg-white/10 text-white/70')}>{label}</span>
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
      <span>共 {total} 条 · 第 {page} / {pages} 页</span>
      <div className="flex gap-2">
        <Button variant="ghost" className="h-9" disabled={page <= 1} onClick={() => onPage(page - 1)}>上一页</Button>
        <Button variant="ghost" className="h-9" disabled={page >= pages} onClick={() => onPage(page + 1)}>下一页</Button>
      </div>
    </div>
  )
}
