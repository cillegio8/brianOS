'use client'

import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { Navigation, ActionItemsList } from '@/components'
import { getClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { ActionItemWithPerson } from '@/lib/database.types'

type FilterType = 'all' | 'pending' | 'completed' | 'overdue'

export default function ActionsPage() {
  const [actionItems, setActionItems] = useState<ActionItemWithPerson[]>([])
  const [filter, setFilter] = useState<FilterType>('pending')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadActions()
  }, [filter])

  const loadActions = async () => {
    const supabase = getClient()
    setIsLoading(true)

    try {
      let query = supabase
        .from('action_items')
        .select(`
          *,
          person:people(*)
        `)
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true })

      if (filter === 'pending') {
        query = query.eq('completed', false)
      } else if (filter === 'completed') {
        query = query.eq('completed', true)
      } else if (filter === 'overdue') {
        query = query
          .eq('completed', false)
          .lt('due_date', new Date().toISOString().split('T')[0])
      }

      const { data } = await query.limit(50)

      if (data) {
        setActionItems(data as ActionItemWithPerson[])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                Action items
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Tasks extracted from your notes
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
            {filterOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap",
                  "transition-colors",
                  filter === option.value
                    ? "bg-brand-600 text-white"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Actions list */}
          <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-5">
            {isLoading ? (
              <div className="text-center py-12 text-[var(--color-text-secondary)]">
                Loading...
              </div>
            ) : (
              <ActionItemsList items={actionItems} onUpdate={loadActions} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
