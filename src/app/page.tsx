'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek } from 'date-fns'
import { Navigation, QuickCapture, ActionItemsList, WeeklyJournal, PersonCard } from '@/components'
import { getClient } from '@/lib/supabase'
import { getWeekOf } from '@/lib/utils'
import type { PersonWithMentions, ActionItemWithPerson, Person, Project } from '@/lib/database.types'

interface WeeklyStats {
  inputCount: number
  peopleCount: number
  projectCount: number
  actionCount: number
  topPeople: Person[]
  topProjects: Project[]
}

export default function HomePage() {
  const [recentPeople, setRecentPeople] = useState<PersonWithMentions[]>([])
  const [actionItems, setActionItems] = useState<ActionItemWithPerson[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    inputCount: 0,
    peopleCount: 0,
    projectCount: 0,
    actionCount: 0,
    topPeople: [],
    topProjects: [],
  })
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const weekOf = getWeekOf()

  const loadData = useCallback(async () => {
    const supabase = getClient()

    try {
      // Get recent people with mention counts
      const { data: people } = await supabase
        .from('people')
        .select(`
          *,
          mentions(count)
        `)
        .order('last_mentioned', { ascending: false })
        .limit(5)

      if (people) {
        setRecentPeople(
          people.map(p => ({
            ...(p as any),
            mentions: [],
            mention_count: ((p as any).mentions as any)?.[0]?.count || 0
          })) as PersonWithMentions[]
        )
      }

      // Get pending action items
      const { data: actions } = await supabase
        .from('action_items')
        .select(`
          *,
          person:people(*)
        `)
        .eq('completed', false)
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true })
        .limit(10)

      if (actions) {
        setActionItems(actions as ActionItemWithPerson[])
      }

      // Get weekly stats
      const weekStart = weekOf
      const weekEnd = format(new Date(new Date(weekOf).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

      const [inputsRes, mentionsRes, actionsRes] = await Promise.all([
        supabase
          .from('raw_inputs')
          .select('id', { count: 'exact' })
          .gte('created_at', weekStart)
          .lt('created_at', weekEnd),
        supabase
          .from('mentions')
          .select('person_id, project_id')
          .eq('week_of', weekStart),
        supabase
          .from('action_items')
          .select('id', { count: 'exact' })
          .gte('created_at', weekStart)
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

      // Get top people and projects for the week
      const { data: topPeopleData } = await supabase
        .from('people')
        .select('*')
        .in('id', Array.from(uniquePeople).slice(0, 5))

      const { data: topProjectsData } = await supabase
        .from('projects')
        .select('*')
        .in('id', Array.from(uniqueProjects).slice(0, 5))

      setWeeklyStats({
        inputCount: inputsRes.count || 0,
        peopleCount: uniquePeople.size,
        projectCount: uniqueProjects.size,
        actionCount: actionsRes.count || 0,
        topPeople: topPeopleData || [],
        topProjects: topProjectsData || [],
      })

      // Get weekly journal
      const { data: journal } = await supabase
        .from('weekly_journals')
        .select('summary')
        .eq('week_of', weekStart)
        .single()

      setWeeklySummary((journal as any)?.summary || null)

    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [weekOf])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />
      
      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          {/* Quick capture */}
          <QuickCapture onCapture={loadData} />

          {/* Weekly journal preview */}
          <WeeklyJournal
            weekOf={weekOf}
            summary={weeklySummary}
            stats={weeklyStats}
            onRegenerate={loadData}
          />

          {/* Two column layout for people and actions */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent people */}
            <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-5">
              <h2 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-4">
                Recent people
              </h2>
              {recentPeople.length > 0 ? (
                <div className="space-y-2">
                  {recentPeople.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      compact
                      onClick={() => router.push(`/people/?person=${person.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[var(--color-text-tertiary)] text-center py-8">
                  People will appear here when you mention them
                </p>
              )}
            </div>

            {/* Action items */}
            <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-5">
              <h2 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-4">
                Action items
              </h2>
              <ActionItemsList items={actionItems} onUpdate={loadData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
