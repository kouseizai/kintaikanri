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
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{dateStr}</p>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
