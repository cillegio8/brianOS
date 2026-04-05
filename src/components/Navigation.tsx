'use client'

import { Brain, Home, Users, CheckSquare, Calendar, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/people/', icon: Users, label: 'People' },
  { href: '/actions/', icon: CheckSquare, label: 'Actions' },
  { href: '/journal/', icon: Calendar, label: 'Journal' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-secondary)] md:relative md:border-t-0 md:border-r md:h-screen md:w-64 md:shrink-0">
      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 p-6 border-b border-[var(--color-border-secondary)]">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-[var(--color-text-primary)]">BrainOS</h1>
          <p className="text-xs text-[var(--color-text-secondary)]">Your second brain</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex md:flex-col justify-around md:justify-start md:p-4 md:gap-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-3 md:rounded-xl",
                "transition-colors",
                isActive
                  ? "text-brand-600 md:bg-brand-50 md:dark:bg-brand-900/20"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] md:hover:bg-[var(--color-bg-secondary)]"
              )}
            >
              <Icon className="w-6 h-6 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm font-medium">{label}</span>
            </Link>
          )
        })}
      </div>

      {/* Desktop settings */}
      <div className="hidden md:block mt-auto p-4 border-t border-[var(--color-border-secondary)]">
        <Link
          href="/settings/"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "transition-colors",
            pathname.startsWith('/settings')
              ? "text-brand-600 bg-brand-50 dark:bg-brand-900/20"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
