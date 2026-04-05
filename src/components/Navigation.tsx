'use client'

import { Brain, Home, Users, CheckSquare, Calendar, Settings, Shield, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from './AuthProvider'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/people/', icon: Users, label: 'People' },
  { href: '/actions/', icon: CheckSquare, label: 'Actions' },
  { href: '/journal/', icon: Calendar, label: 'Journal' },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

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

      {/* User info */}
      <div className="hidden md:block p-4 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-sm font-medium text-brand-600">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {user?.email || ''}
            </p>
          </div>
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

        {/* Admin link (only for admins) */}
        {isAdmin && (
          <Link
            href="/admin/"
            className={cn(
              "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-4 py-3 md:rounded-xl",
              "transition-colors",
              pathname.startsWith('/admin')
                ? "text-brand-600 md:bg-brand-50 md:dark:bg-brand-900/20"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] md:hover:bg-[var(--color-bg-secondary)]"
            )}
          >
            <Shield className="w-6 h-6 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium">Admin</span>
          </Link>
        )}
      </div>

      {/* Desktop settings and sign out */}
      <div className="hidden md:block mt-auto p-4 border-t border-[var(--color-border-secondary)] space-y-1">
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
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}
