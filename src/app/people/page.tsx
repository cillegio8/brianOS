'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, UserPlus } from 'lucide-react'
import { Navigation, PersonCard, PersonList } from '@/components'
import { getClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { PersonWithMentions, Mention, RawInput } from '@/lib/database.types'

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonWithMentions[]>([])
  const [selectedPerson, setSelectedPerson] = useState<PersonWithMentions | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    loadPeople()
  }, [])

  const loadPeople = async () => {
    const supabase = getClient()

    try {
      const { data } = await supabase
        .from('people')
        .select(`
          *,
          mentions(count)
        `)
        .order('last_mentioned', { ascending: false })

      if (data) {
        const mapped = data.map(p => ({
          ...(p as any),
          mentions: [],
          mention_count: ((p as any).mentions as any)?.[0]?.count || 0
        })) as PersonWithMentions[]

        setPeople(mapped)

        const personId = searchParams.get('person')
        if (personId) {
          const match = mapped.find(p => p.id === personId)
          if (match) loadPersonDetails(match)
        }
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPersonDetails = async (person: PersonWithMentions) => {
    const supabase = getClient()

    try {
      const { data: mentions } = await supabase
        .from('mentions')
        .select(`
          *,
          raw_input:raw_inputs(*)
        `)
        .eq('person_id', person.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setSelectedPerson({
        ...person,
        mentions: mentions as (Mention & { raw_input: RawInput })[] || []
      })
    } catch (err) {
      console.error('Load details error:', err)
      setSelectedPerson(person)
    }
  }

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                People
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                {people.length} people in your network
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-xl",
                "bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)]",
                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
              )}
            />
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* People list */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                  Loading...
                </div>
              ) : filteredPeople.length > 0 ? (
                filteredPeople.map(person => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    compact
                    onClick={() => loadPersonDetails(person)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No people found</p>
                  <p className="text-sm">Mention someone in your notes and they'll appear here</p>
                </div>
              )}
            </div>

            {/* Person detail */}
            <div className="hidden md:block">
              {selectedPerson ? (
                <div className="sticky top-8">
                  <PersonCard person={selectedPerson} />
                </div>
              ) : (
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl p-8 text-center text-[var(--color-text-secondary)]">
                  <p>Select a person to see details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
