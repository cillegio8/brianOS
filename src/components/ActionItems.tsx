'use client'

import { useState, useEffect } from 'react'
import { Check, Circle, AlertCircle, Clock } from 'lucide-react'
import { getClient } from '@/lib/supabase'
import { cn, getInitials, getColorForName, getRelativeTime } from '@/lib/utils'
import type { ActionItemWithPerson } from '@/lib/database.types'

interface ActionItemRowProps {
  item: ActionItemWithPerson
  onToggle?: (id: string, completed: boolean) => void
  onDelete?: (id: string) => void
}

function ActionItemRow({ item, onToggle, onDelete }: ActionItemRowProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async () => {
    if (isUpdating) return
    setIsUpdating(true)
    
    try {
      const supabase = getClient()
      await (supabase as any)
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
          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete?.(item.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              "hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            )}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

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
  onDelete?: (id: string) => void
}

export function ActionItemsList({ items, onUpdate, onDelete }: ActionItemsListProps) {
  const [localItems, setLocalItems] = useState(items)

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  const handleToggle = (id: string, completed: boolean) => {
    setLocalItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, completed } : item
      )
    )
    onUpdate?.()
  }

  const handleDelete = async (id: string) => {
    if (!onDelete) return

    try {
      const supabase = getClient()
      await (supabase as any)
        .from('action_items')
        .delete()
        .eq('id', id)

      setLocalItems(prev => prev.filter(item => item.id !== id))
      onUpdate?.()
      onDelete(id)
    } catch (err) {
      console.error('Delete error:', err)
    }
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
              <ActionItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
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
              <ActionItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
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
