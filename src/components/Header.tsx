interface HeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="px-8 pt-8 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: '#8e8e93' }}>{dateStr}</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#1c1c1e' }}>{title}</h2>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: '#8e8e93' }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  )
}
