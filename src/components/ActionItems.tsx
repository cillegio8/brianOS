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
        "group relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-300",
        "bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)]",
        "hover:shadow-md hover:shadow-brand-500/5 hover:-translate-y-0.5",
        item.completed && "opacity-60 grayscale-[0.5]"
      )}
    >
      {/* Selection indicator line */}
      <div className={cn(
        "absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all duration-300 opacity-0 group-hover:opacity-100",
        priorityColors[item.priority]
      )} />
      <button
        type="button"
        onClick={handleToggle}
        disabled={isUpdating}
        className={cn(
          "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5",
          "transition-all duration-200 transform active:scale-90",
          item.completed
            ? "bg-brand-600 border-brand-600 text-white"
            : "border-[var(--color-border-primary)] group-hover:border-brand-400 bg-[var(--color-bg-secondary)]"
        )}
      >
        {item.completed ? (
          <Check className="w-4 h-4 stroke-[3px]" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[var(--color-text-primary)]",
          item.completed && "line-through"
        )}>
          {item.description}
        </p>
        
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {/* Priority indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]">
            <div className={cn("w-2 h-2 rounded-full shadow-sm", priorityColors[item.priority])} />
            <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              {item.priority}
            </span>
          </div>
          
          {/* Due date */}
          {item.due_date && (
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md",
              isOverdue 
                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200/50" 
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-secondary)]"
            )}>
              {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{isOverdue ? 'Overdue' : getRelativeTime(item.due_date)}</span>
            </div>
          )}

          {/* Delete button - only show on hover */}
          <button
            type="button"
            onClick={() => onDelete?.(item.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-200",
              "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200/50 hover:bg-red-100 dark:hover:bg-red-800/40"
            )}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
          {/* Person */}
          {item.person && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{
                  backgroundColor: getColorForName(item.person.name).bg,
                  color: getColorForName(item.person.name).text
                }}
              >
                {getInitials(item.person.name)}
              </div>
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
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
    try {
      const supabase = getClient()
      console.log('Attempting to delete action item with id:', id)
      
      const { error } = await (supabase as any)
        .from('action_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      console.log('Successfully deleted action item:', id)
      setLocalItems(prev => prev.filter(item => item.id !== id))
      onUpdate?.()
      onDelete?.(id)
    } catch (err) {
      console.error('Delete error:', err)
      alert(`Failed to delete action item: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
