'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Send } from 'lucide-react'
import { getClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface QuickCaptureProps {
  onCapture?: () => void
}

export function QuickCapture({ onCapture }: QuickCaptureProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = getClient()
      
      // Insert raw input
      const { data: input, error: insertError } = await (supabase as any)
        .from('raw_inputs')
        .insert({
          content: content.trim(),
          source: 'quick',
          processed: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Trigger AI extraction via Edge Function
      const extractModel = localStorage.getItem('brainos_extract_model') || undefined
      const { error: fnError } = await supabase.functions.invoke('extract', {
        body: { input_id: input.id, model: extractModel }
      })

      if (fnError) {
        console.error('Extraction error:', fnError)
        // Don't fail the whole thing if extraction fails
      }

      setContent('')
      onCapture?.()
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []

        mediaRecorder.ondataavailable = (e) => {
          chunksRef.current.push(e.data)
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(track => track.stop())
          
          // For MVP: just transcribe using browser's Web Speech API
          // In production: upload to Supabase Storage + Whisper
          setContent(prev => prev + '\n[Voice memo recorded - transcription coming soon]')
        }

        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        console.error('Recording error:', err)
        setError('Could not access microphone')
      }
    }
  }

  return (
    <div className="group relative bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-5 shadow-lg shadow-brand-500/5 hover:shadow-brand-500/10 transition-all duration-300">
      {/* Decorative gradient border effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-400 to-brand-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest">
            Quick capture
          </span>
        </div>
        <span className="text-xs font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-md">
          ⌘ + Enter
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Dump your thoughts... meetings, ideas, people, anything."
        className={cn(
          "w-full min-h-[140px] max-h-[400px] p-4 rounded-xl resize-none translate-z-0",
          "bg-[var(--color-bg-secondary)]/50 backdrop-blur-sm border-2 border-transparent",
          "text-[16px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "focus:outline-none focus:border-brand-400/30 focus:bg-[var(--color-bg-secondary)]",
          "transition-all duration-200 leading-relaxed custom-scrollbar"
        )}
      />

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={toggleRecording}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "transition-colors",
            isRecording 
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
          )}
        >
          {isRecording ? (
            <>
              <MicOff className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Voice
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold",
            "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/20",
            "hover:shadow-lg hover:shadow-brand-600/30 hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-95 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  )
}
