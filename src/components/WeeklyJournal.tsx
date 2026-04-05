'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Loader2, Calendar, Users, Folder, CheckSquare } from 'lucide-react'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { getClient } from '@/lib/supabase'
import { cn, formatWeekRange, getInitials, getColorForName } from '@/lib/utils'
import type { Person, Project, ActionItem, Mention } from '@/lib/database.types'

interface WeeklyStats {
  inputCount: number
  peopleCount: number
  projectCount: number
  actionCount: number
  topPeople: Person[]
  topProjects: Project[]
}

interface WeeklyJournalProps {
  weekOf: string
  summary: string | null
  stats: WeeklyStats
  onRegenerate?: () => void
  onDelete?: (weekOf: string) => void
}

export function WeeklyJournal({ weekOf, summary, stats, onRegenerate, onDelete }: WeeklyJournalProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date(weekOf))

  const handleRegenerate = async () => {
    if (isRegenerating) return
    setIsRegenerating(true)

    try {
      const supabase = getClient()
      const journalModel = localStorage.getItem('brainos_journal_model') || undefined
      await supabase.functions.invoke('generate-journal', {
        body: { week_of: format(currentWeek, 'yyyy-MM-dd'), model: journalModel }
      })
      onRegenerate?.()
    } catch (err) {
      console.error('Regenerate error:', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    try {
      const supabase = getClient()
      const { error } = await (supabase as any)
        .from('weekly_journals')
        .delete()
        .eq('week_of', weekOf)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      onDelete(weekOf)
    } catch (err) {
      console.error('Delete error:', err)
      alert(`Failed to delete journal: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    const next = addWeeks(currentWeek, 1)
    if (next <= new Date()) {
      setCurrentWeek(next)
    }
  }

  const isCurrentWeek = format(currentWeek, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToPreviousWeek}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Week of
              </p>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {formatWeekRange(format(currentWeek, 'yyyy-MM-dd'))}
              </h2>
            </div>
            <button
              type="button"
              onClick={goToNextWeek}
              disabled={isCurrentWeek}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isCurrentWeek 
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-[var(--color-bg-secondary)]"
              )}
            >
              <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                "hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                "bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]",
                "text-[var(--color-text-secondary)] transition-colors"
              )}
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-px bg-[var(--color-border-secondary)]">
        {[
          { icon: Calendar, label: 'Captures', value: stats.inputCount },
          { icon: Users, label: 'People', value: stats.peopleCount },
          { icon: Folder, label: 'Projects', value: stats.projectCount },
          { icon: CheckSquare, label: 'Actions', value: stats.actionCount },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[var(--color-bg-primary)] p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-1 text-[var(--color-text-tertiary)]" />
            <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <div className="p-5 border-t border-[var(--color-border-secondary)]">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
          AI Summary
        </h3>
        {summary ? (
          <p className="text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        ) : (
          <div className="text-center py-6 text-[var(--color-text-secondary)]">
            <p>No summary yet</p>
            <button
              type="button"
              onClick={handleRegenerate}
              className="text-brand-600 hover:text-brand-700 text-sm mt-1"
            >
              Generate now
            </button>
          </div>
        )}
      </div>

      {/* Key people */}
      {stats.topPeople.length > 0 && (
        <div className="p-5 border-t border-[var(--color-border-secondary)]">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
            Key people this week
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.topPeople.map(person => {
              const color = getColorForName(person.name)
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)]"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                    style={{ backgroundColor: color.bg, color: color.text }}
                  >
                    {getInitials(person.name)}
                  </div>
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {person.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active projects */}
      {stats.topProjects.length > 0 && (
        <div className="p-5 border-t border-[var(--color-border-secondary)]">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
            Projects touched
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.topProjects.map(project => (
              <span
                key={project.id}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm",
                  "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                )}
              >
                {project.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
