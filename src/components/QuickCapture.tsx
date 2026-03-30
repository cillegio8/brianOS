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
    <div className="bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border-secondary)] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          Quick capture
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          ⌘ + Enter to save
        </span>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Dump your thoughts here... meetings, ideas, people, anything."
        className={cn(
          "w-full min-h-[120px] max-h-[300px] p-3 rounded-xl resize-none",
          "bg-[var(--color-bg-secondary)] border-0",
          "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]",
          "focus:outline-none focus:ring-2 focus:ring-brand-400/50",
          "text-[15px] leading-relaxed"
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
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
            "bg-brand-600 text-white",
            "hover:bg-brand-700 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
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
