'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfWeek, subWeeks } from 'date-fns'
import { Navigation, WeeklyJournal } from '@/components'
import { getClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Person, Project } from '@/lib/database.types'

interface WeekData {
  weekOf: string
  summary: string | null
  stats: {
    inputCount: number
    peopleCount: number
    projectCount: number
    actionCount: number
    topPeople: Person[]
    topProjects: Project[]
  }
}

export default function JournalPage() {
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadWeeks = useCallback(async () => {
    const supabase = getClient()
    setIsLoading(true)

    try {
      // Load last 8 weeks
      const weekDates = Array.from({ length: 8 }, (_, i) => {
        const date = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i)
        return format(date, 'yyyy-MM-dd')
      })

      const weeksData: WeekData[] = []

      for (const weekOf of weekDates) {
        const weekEnd = format(new Date(new Date(weekOf).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

        const [journalRes, inputsRes, mentionsRes, actionsRes] = await Promise.all([
          supabase
            .from('weekly_journals')
            .select('summary')
            .eq('week_of', weekOf)
            .single(),
          supabase
            .from('raw_inputs')
            .select('id', { count: 'exact' })
            .gte('created_at', weekOf)
            .lt('created_at', weekEnd),
          supabase
            .from('mentions')
            .select('person_id, project_id')
            .eq('week_of', weekOf),
          supabase
            .from('action_items')
            .select('id', { count: 'exact' })
            .gte('created_at', weekOf)
            .lt('created_at', weekEnd),
        ])

        const uniquePeople = new Set(
          (mentionsRes.data as Array<{person_id: string | null, project_id: string | null}> || [])
            .map(m => m.person_id)
            .filter(Boolean)
        )
        const uniqueProjects = new Set(
          (mentionsRes.data as Array<{person_id: string | null, project_id: string | null}> || [])
            .map(m => m.project_id)
            .filter(Boolean)
        )

        // Get top people and projects
        const { data: topPeopleData } = await supabase
          .from('people')
          .select('*')
          .in('id', Array.from(uniquePeople).slice(0, 5))

        const { data: topProjectsData } = await supabase
          .from('projects')
          .select('*')
          .in('id', Array.from(uniqueProjects).slice(0, 5))

        weeksData.push({
          weekOf,
          summary: journalRes.data?.summary || null,
          stats: {
            inputCount: inputsRes.count || 0,
            peopleCount: uniquePeople.size,
            projectCount: uniqueProjects.size,
            actionCount: actionsRes.count || 0,
            topPeople: topPeopleData || [],
            topProjects: topProjectsData || [],
          }
        })
      }

      setWeeks(weeksData)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWeeks()
  }, [loadWeeks])

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              Weekly journals
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              AI-generated summaries of your weeks
            </p>
          </div>

          {/* Weeks */}
          {isLoading ? (
            <div className="text-center py-12 text-[var(--color-text-secondary)]">
              Loading...
            </div>
          ) : (
            <div className="space-y-6">
              {weeks.map(week => (
                <WeeklyJournal
                  key={week.weekOf}
                  weekOf={week.weekOf}
                  summary={week.summary}
                  stats={week.stats}
                  onRegenerate={loadWeeks}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
