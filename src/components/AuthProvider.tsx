'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { getClient } from '@/lib/supabase'
import type { User } from '@/lib/database.types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function fetchUserRecord(userId: string): Promise<User | null> {
  try {
    const supabase = getClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.warn('[AuthProvider] Could not fetch user record:', error.message)
      return null
    }
    return data as User
  } catch (err) {
    console.error('[AuthProvider] fetchUserRecord threw:', err)
    return null
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null)
  const [isLoading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const supabase   = getClient()

    async function handleSession(session: any) {
      if (!mounted.current) return

      if (session?.user) {
        const record = await fetchUserRecord(session.user.id)
        if (mounted.current) setUser(record)
      } else {
        if (mounted.current) setUser(null)
      }

      if (mounted.current) setLoading(false)
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session)
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  // ── Auth actions ────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const supabase = getClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string) => {
    const supabase = getClient()
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role: 'user',
      } as any)
    }
  }

  const signOut = async () => {
    const supabase = getClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ── Value ───────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAdmin: user?.role === 'admin',
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}