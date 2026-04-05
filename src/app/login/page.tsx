'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password, name)
      } else {
        await signIn(email, password)
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              {isSignUp ? 'Create a new account to get started' : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl",
                    "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                    "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                  )}
                  placeholder="Enter your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                  "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                )}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(
                  "w-full px-4 py-3 rounded-xl",
                  "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                  "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                  "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                )}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full px-4 py-3 rounded-xl text-sm font-medium",
                "bg-brand-600 text-white",
                "hover:bg-brand-700 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}