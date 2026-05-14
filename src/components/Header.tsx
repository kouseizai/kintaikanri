interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="px-4 md:px-10 pt-7 md:pt-10 pb-6 md:pb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--text-muted)' }} />
            <p className="text-[11px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
              {dateStr}
            </p>
          </div>
          <h1 className="text-2xl md:text-[28px] font-display font-bold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
