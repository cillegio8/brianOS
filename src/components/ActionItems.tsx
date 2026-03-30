'use client'

import { useState } from 'react'
import { Check, Circle, AlertCircle, Clock } from 'lucide-react'
import { getClient } from '@/lib/supabase'
import { cn, getInitials, getColorForName, getRelativeTime } from '@/lib/utils'
import type { ActionItemWithPerson } from '@/lib/database.types'

interface ActionItemRowProps {
  item: ActionItemWithPerson
  onToggle?: (id: string, completed: boolean) => void
}

function ActionItemRow({ item, onToggle }: ActionItemRowProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    
    try {
      const supabase = getClient()
      await supabase
        .from('action_items')
        .update({ completed: !item.completed })
        .eq('id', item.id)
      
      onToggle?.(item.id, !item.completed)
    } catch (err) {
      console.error('Toggle error:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
  }

  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && !item.completed

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl",
        "bg-[var(--color-bg-secondary)]",
        item.completed && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={isUpdating}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
          "transition-colors",
          item.completed
            ? "bg-brand-600 border-brand-600 text-white"
            : "border-[var(--color-border-primary)] hover:border-brand-400"
        )}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[var(--color-text-primary)]",
          item.completed && "line-through"
        )}>
          {item.description}
        </p>
        
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Priority indicator */}
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", priorityColors[item.priority])} />
            <span className="text-xs text-[var(--color-text-secondary)] capitalize">
              {item.priority}
            </span>
          </div>

          {/* Due date */}
          {item.due_date && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-red-500" : "text-[var(--color-text-secondary)]"
            )}>
              {isOverdue ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>
                {isOverdue ? 'Overdue' : getRelativeTime(item.due_date)}
              </span>
            </div>
          )}

          {/* Person */}
          {item.person && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium"
                style={{
                  backgroundColor: getColorForName(item.person.name).bg,
                  color: getColorForName(item.person.name).text
                }}
              >
                {getInitials(item.person.name)}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {item.person.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ActionItemsListProps {
  items: ActionItemWithPerson[]
  onUpdate?: () => void
}

export function ActionItemsList({ items, onUpdate }: ActionItemsListProps) {
  const [localItems, setLocalItems] = useState(items)

  const handleToggle = (id: string, completed: boolean) => {
    setLocalItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed } : item
      )
    )
    onUpdate?.()
  }

  const pendingItems = localItems.filter(i => !i.completed)
  const completedItems = localItems.filter(i => i.completed)

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingItems.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
            To do ({pendingItems.length})
          </h3>
          <div className="space-y-2">
            {pendingItems.map(item => (
              <ActionItemRow key={item.id} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedItems.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">
            Completed ({completedItems.length})
          </h3>
          <div className="space-y-2">
            {completedItems.map(item => (
              <ActionItemRow key={item.id} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      )}

      {localItems.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-secondary)]">
          <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No action items yet</p>
          <p className="text-sm">They'll appear here when AI extracts them from your notes</p>
        </div>
      )}
    </div>
  )
}
