'use client'

import { useState } from 'react'
import { ChevronRight, MessageSquare } from 'lucide-react'
import { cn, getInitials, getColorForName, getRelativeTime } from '@/lib/utils'
import type { PersonWithMentions } from '@/lib/database.types'

interface PersonCardProps {
  person: PersonWithMentions
  compact?: boolean
  onClick?: () => void
}

export function PersonCard({ person, compact = false, onClick }: PersonCardProps) {
  const color = getColorForName(person.name)
  const initials = getInitials(person.name)

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl w-full text-left",
          "bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]",
          "transition-colors group"
        )}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text-primary)] truncate">
            {person.name}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] truncate">
            {person.mention_count} mention{person.mention_count !== 1 ? 's' : ''}
            {person.last_mentioned && (
              <> · {getRelativeTime(person.last_mentioned)}</>
            )}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)] transition-colors" />
      </button>
    )
  }

  return (
    <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-medium shrink-0"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {person.name}
            </h2>
            {person.aliases.length > 0 && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Also known as: {person.aliases.join(', ')}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <div className="text-sm">
                <span className="text-[var(--color-text-secondary)]">Mentions: </span>
                <span className="font-medium">{person.mention_count}</span>
              </div>
              {person.last_mentioned && (
                <div className="text-sm">
                  <span className="text-[var(--color-text-secondary)]">Last seen: </span>
                  <span className="font-medium">{getRelativeTime(person.last_mentioned)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context */}
      {person.context && (
        <div className="p-5 border-b border-[var(--color-border-secondary)]">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-2">
            Context
          </h3>
          <p className="text-[var(--color-text-primary)] leading-relaxed">
            {person.context}
          </p>
        </div>
      )}

      {/* Recent mentions */}
      {person.mentions && person.mentions.length > 0 && (
        <div className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
            Recent mentions
          </h3>
          <div className="space-y-3">
            {person.mentions.slice(0, 5).map((mention) => (
              <div
                key={mention.id}
                className="flex gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]"
              >
                <MessageSquare className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {mention.snippet}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {getRelativeTime(mention.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact list version
interface PersonListProps {
  people: PersonWithMentions[]
  onSelect?: (person: PersonWithMentions) => void
}

export function PersonList({ people, onSelect }: PersonListProps) {
  return (
    <div className="space-y-2">
      {people.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          compact
          onClick={() => onSelect?.(person)}
        />
      ))}
    </div>
  )
}
