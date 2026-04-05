export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      raw_inputs: {
        Row: {
          id: string
          content: string
          source: 'quick' | 'voice' | 'email'
          audio_url: string | null
          processed: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          content: string
          source?: 'quick' | 'voice' | 'email'
          audio_url?: string | null
          processed?: boolean
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          content?: string
          source?: 'quick' | 'voice' | 'email'
          audio_url?: string | null
          processed?: boolean
          created_at?: string
          user_id?: string
        }
      }
      people: {
        Row: {
          id: string
          name: string
          aliases: string[]
          context: string | null
          embedding: number[] | null
          last_mentioned: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          aliases?: string[]
          context?: string | null
          embedding?: number[] | null
          last_mentioned?: string | null
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          aliases?: string[]
          context?: string | null
          embedding?: number[] | null
          last_mentioned?: string | null
          created_at?: string
          user_id?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          status: 'active' | 'done' | 'stalled'
          context: string | null
          embedding: number[] | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          status?: 'active' | 'done' | 'stalled'
          context?: string | null
          embedding?: number[] | null
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          status?: 'active' | 'done' | 'stalled'
          context?: string | null
          embedding?: number[] | null
          created_at?: string
          user_id?: string
        }
      }
      mentions: {
        Row: {
          id: string
          input_id: string
          person_id: string | null
          project_id: string | null
          snippet: string
          week_of: string
          created_at: string
        }
        Insert: {
          id?: string
          input_id: string
          person_id?: string | null
          project_id?: string | null
          snippet: string
          week_of: string
          created_at?: string
        }
        Update: {
          id?: string
          input_id?: string
          person_id?: string | null
          project_id?: string | null
          snippet?: string
          week_of?: string
          created_at?: string
        }
      }
      action_items: {
        Row: {
          id: string
          input_id: string
          description: string
          person_id: string | null
          due_date: string | null
          completed: boolean
          priority: 'high' | 'medium' | 'low'
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          input_id: string
          description: string
          person_id?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: 'high' | 'medium' | 'low'
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          input_id?: string
          description?: string
          person_id?: string | null
          due_date?: string | null
          completed?: boolean
          priority?: 'high' | 'medium' | 'low'
          created_at?: string
          user_id?: string
        }
      }
      weekly_journals: {
        Row: {
          id: string
          week_of: string
          summary: string
          generated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          week_of: string
          summary: string
          generated_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          week_of?: string
          summary?: string
          generated_at?: string
          user_id?: string
        }
      }
    }
  }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type RawInput = Database['public']['Tables']['raw_inputs']['Row']
export type Person = Database['public']['Tables']['people']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Mention = Database['public']['Tables']['mentions']['Row']
export type ActionItem = Database['public']['Tables']['action_items']['Row']
export type WeeklyJournal = Database['public']['Tables']['weekly_journals']['Row']

// Extended types with relations
export type PersonWithMentions = Person & {
  mentions: (Mention & { raw_input: RawInput })[]
  mention_count: number
}

export type ActionItemWithPerson = ActionItem & {
  person: Person | null
}
