'use client'

import { useEffect, useState, Suspense } from 'react'
import { Navigation } from '@/components'
import { useAuth } from '@/components/AuthProvider'
import { getClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/database.types'

function AdminPageContent() {
  const { user: currentUser, isAdmin } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' })
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const supabase = getClient()

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data as User[])
      }
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          email: newUser.email,
          name: newUser.name,
          role: newUser.role as 'admin' | 'user',
        } as any)

      if (error) throw error

      setNewUser({ email: '', name: '', role: 'user' })
      setShowAddUser(false)
      loadUsers()
    } catch (err) {
      console.error('Error adding user:', err)
      alert('Failed to add user')
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({
          email: editingUser.email,
          name: editingUser.name,
          role: editingUser.role,
        })
        .eq('id', editingUser.id)

      if (error) throw error

      setEditingUser(null)
      loadUsers()
    } catch (err) {
      console.error('Error updating user:', err)
      alert('Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will delete all their data.')) {
      return
    }

    try {
      const { error } = await (supabase as any)
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      loadUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      alert('Failed to delete user')
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Navigation />
        <main className="flex-1 pb-24 md:pb-0">
          <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                Access Denied
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-2">
                You don't have permission to access this page.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Navigation />

      <main className="flex-1 pb-24 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                User Management
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Manage users and their access
              </p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium",
                "bg-brand-600 text-white",
                "hover:bg-brand-700 transition-colors"
              )}
            >
              Add User
            </button>
          </div>

          {/* Add User Form */}
          {showAddUser && (
            <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-6 mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Add New User
              </h2>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                        "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                        "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                      )}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className={cn(
                        "w-full px-4 py-3 rounded-xl",
                        "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                        "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                        "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                      )}
                      placeholder="Enter name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                      "text-[var(--color-text-primary)]",
                      "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                    )}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium",
                      "bg-brand-600 text-white",
                      "hover:bg-brand-700 transition-colors"
                    )}
                  >
                    Add User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium",
                      "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]",
                      "hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border-secondary)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Users ({users.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="p-5 text-center text-[var(--color-text-secondary)]">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="p-5 text-center text-[var(--color-text-secondary)]">
                No users found
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border-secondary)]">
                {users.map(user => (
                  <div key={user.id} className="p-5">
                    {editingUser?.id === user.id ? (
                      <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={editingUser.email}
                              onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                              required
                              className={cn(
                                "w-full px-4 py-3 rounded-xl",
                                "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                                "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                              )}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editingUser.name}
                              onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                              required
                              className={cn(
                                "w-full px-4 py-3 rounded-xl",
                                "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                                "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
                                "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                              )}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                            Role
                          </label>
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as 'admin' | 'user' } : null)}
                            className={cn(
                              "w-full px-4 py-3 rounded-xl",
                              "bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)]",
                              "text-[var(--color-text-primary)]",
                              "focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                            )}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-medium",
                              "bg-brand-600 text-white",
                              "hover:bg-brand-700 transition-colors"
                            )}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-sm font-medium",
                              "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]",
                              "hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            )}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[var(--color-text-primary)]">
                              {user.name}
                            </h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              user.role === 'admin' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>
                              {user.role}
                            </span>
                            {user.id === currentUser?.id && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {user.email}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            Created: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium",
                              "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]",
                              "hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            )}
                          >
                            Edit
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium",
                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                "hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                              )}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageContent />
    </Suspense>
  )
}