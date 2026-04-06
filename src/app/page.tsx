'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek } from 'date-fns'
import { Navigation, QuickCapture, ActionItemsList, WeeklyJournal, PersonCard, ProtectedRoute, DashboardHeader } from '@/components'
import { getClient } from '@/lib/supabase'
import { getWeekOf } from '@/lib/utils'
import { Sparkles, Target, Users } from 'lucide-react'
import type { PersonWithMentions, ActionItemWithPerson, Person, Project } from '@/lib/database.types'

interface WeeklyStats {
  inputCount: number
  peopleCount: number
  projectCount: number
  actionCount: number
  topPeople: Person[]
  topProjects: Project[]
}

function HomePageContent() {
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

  const handleDelete = async (id: string) => {
    try {
      const supabase = getClient()
      await (supabase as any)
        .from('action_items')
        .delete()
        .eq('id', id)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      loadData()
    }
  }

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
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--color-bg-tertiary)]/30">
      <Navigation />
      
      <main className="flex-1 pb-24 md:pb-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-10">
          <DashboardHeader stats={{ inputCount: weeklyStats.inputCount, actionCount: weeklyStats.actionCount }} />

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Insights & Capture (Left 8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              {/* Quick capture - prominent */}
              <section className="relative group">
                <QuickCapture onCapture={loadData} />
              </section>

              {/* Weekly Intelligence */}
              <section className="relative">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <h3 className="text-xs font-black text-[var(--color-text-secondary)] uppercase tracking-[0.2em]">
                    Weekly Intelligence
                  </h3>
                </div>
                <WeeklyJournal
                  weekOf={weekOf}
                  summary={weeklySummary}
                  stats={weeklyStats}
                  onRegenerate={loadData}
                />
              </section>
            </div>

            {/* Missions & Network (Right 4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Action Items - Mission Log */}
              <div className="bg-[var(--color-bg-primary)] rounded-3xl border border-[var(--color-border-secondary)] shadow-xl shadow-brand-900/5 overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-6 border-b border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)]/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-brand-500" />
                    <h2 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-wider">
                      Mission Log
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <ActionItemsList items={actionItems} onUpdate={loadData} onDelete={handleDelete} />
                </div>
              </div>

              {/* Recent People - Intel Network */}
              <div className="bg-[var(--color-bg-primary)] rounded-3xl border border-[var(--color-border-secondary)] shadow-xl shadow-brand-900/5 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-4 h-4 text-brand-500" />
                  <h2 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-wider">
                    Intel Network
                  </h2>
                </div>
                
                {recentPeople.length > 0 ? (
                  <div className="space-y-3">
                    {recentPeople.map((person) => (
                      <div key={person.id} className="group cursor-pointer" onClick={() => router.push(`/people/?person=${person.id}`)}>
                        <PersonCard
                          person={person}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-[var(--color-text-tertiary)]" />
                    </div>
                    <p className="text-xs font-medium text-[var(--color-text-tertiary)]">
                      Your network will appear here as you mention people in your captures.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomePageContent />
    </ProtectedRoute>
  )
}
