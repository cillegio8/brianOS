'use client'

import { useAuth } from './AuthProvider'
import { Sparkles, Activity, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  stats: {
    inputCount: number
    actionCount: number
  }
}

export function DashboardHeader({ stats }: DashboardHeaderProps) {
  const { user } = useAuth()
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.name?.split(' ')[0] || 'Explorer'

  return (
    <header className="relative mb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex -space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em]">
              System Active
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--color-text-primary)] tracking-tight">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">{firstName}</span>
          </h1>
          <p className="mt-2 text-[var(--color-text-secondary)] font-medium max-w-md">
            Your second brain has processed <span className="text-brand-600 font-bold">{stats.inputCount}</span> insights and tracking <span className="text-brand-600 font-bold">{stats.actionCount}</span> missions this week.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-2xl p-2 shadow-sm">
            <StatPill icon={Activity} label="Insights" value={stats.inputCount} color="text-blue-500" />
            <div className="w-px h-8 bg-[var(--color-border-secondary)]" />
            <StatPill icon={Target} label="Missions" value={stats.actionCount} color="text-emerald-500" />
          </div>
          
          <button className="group relative flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 transition-all hover:-translate-y-0.5 active:translate-y-0">
            <Sparkles className="w-4 h-4 group-hover:animate-spin-slow" />
            Launch AI Assistant
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>
    </header>
  )
}

function StatPill({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--color-bg-secondary)] shadow-inner", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--color-text-primary)]">{value}</p>
        <p className="text-[8px] font-black text-[var(--color-text-tertiary)] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  )
}
