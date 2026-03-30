import { clsx, type ClassValue } from 'clsx'
import { startOfWeek, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getWeekOf(date: Date = new Date()): string {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  return format(start, 'yyyy-MM-dd')
}

export function formatWeekRange(weekOf: string): string {
  const start = new Date(weekOf)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return format(then, 'MMM d')
}

// Color helpers for person/project cards
const colors = [
  { bg: '#E1F5EE', text: '#085041' }, // teal
  { bg: '#EEEDFE', text: '#3C3489' }, // purple
  { bg: '#FAEEDA', text: '#633806' }, // amber
  { bg: '#FAECE7', text: '#712B13' }, // coral
  { bg: '#E6F1FB', text: '#0C447C' }, // blue
  { bg: '#FBEAF0', text: '#72243E' }, // pink
]

export function getColorForName(name: string) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
