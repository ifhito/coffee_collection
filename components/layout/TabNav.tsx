"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Tab = { id: string; href: string; label: string; icon?: string }

export function TabNav() {
  const pathname = usePathname()

  const tabs: Tab[] = [
    { id: 'dashboard', href: '/', label: 'ダッシュボード', icon: '📊' },
    { id: 'beans', href: '/beans', label: '豆一覧', icon: '🫘' },
    { id: 'viz', href: '/viz', label: '可視化', icon: '🔍' },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap scrollbar-thin">
          {tabs.map((t) => {
            const active = isActive(t.href)
            return (
              <Link
                key={t.id}
                href={t.href}
                className={[
                  'flex items-center gap-2 px-3 py-2 text-sm sm:text-base rounded-none border-b-2',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                ].join(' ')}
              >
                {t.icon ? <span aria-hidden>{t.icon}</span> : null}
                {t.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
