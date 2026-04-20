import clsx from 'clsx'

interface Props {
  title?: string
  sub?: string
  children: React.ReactNode
  className?: string
}

export default function Card({ title, sub, children, className }: Props) {
  return (
    <div className={clsx('bg-card border border-border rounded-2xl p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]', className)}>
      {title && (
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm font-medium text-text">{title}</p>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
